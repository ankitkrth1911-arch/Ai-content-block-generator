import OpenAI from "openai";
import { PageSchema, Page } from "./schema";

/**
 * Custom error types to allow route handlers to map to appropriate HTTP status codes:
 * - LLMApiError: Transient OpenAI network/API error (maps to 503)
 * - LLMRefusalError: OpenAI explicit policy refusal (maps to 400)
 * - LLMGenerationError: Content validation exhausted after retries (maps to 502)
 */
export class LLMApiError extends Error {
  readonly status = 503;
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "LLMApiError";
    this.originalError = originalError;
  }
}

export class LLMRefusalError extends Error {
  readonly status = 400;
  readonly refusal: string;

  constructor(refusal: string) {
    super(`Model refused request: ${refusal}`);
    this.name = "LLMRefusalError";
    this.refusal = refusal;
  }
}

export class LLMGenerationError extends Error {
  readonly status = 502;
  readonly details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = "LLMGenerationError";
    this.details = details;
  }
}

/**
 * Model-facing JSON Schema for OpenAI structured outputs (response_format).
 *
 * NOTE:
 * 1. Root object and all child objects MUST have additionalProperties: false
 *    and list all properties in required.
 * 2. Optional properties (like subheading) must be typed as ["string", "null"].
 * 3. OpenAI strict mode does not enforce positional tuples or array lengths,
 *    so this schema uses an array of anyOf block schemas. Zod PageSchema is
 *    the definitive runtime source of truth.
 */
export const openAiPageJsonSchema = {
  name: "page",
  strict: true,
  schema: {
    type: "object",
    properties: {
      blocks: {
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["hero"] },
                heading: { type: "string" },
                subheading: { type: ["string", "null"] },
              },
              required: ["type", "heading", "subheading"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["features"] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["type", "items"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                type: { type: "string", enum: ["footer"] },
                text: { type: "string" },
              },
              required: ["type", "text"],
              additionalProperties: false,
            },
          ],
        },
      },
    },
    required: ["blocks"],
    additionalProperties: false,
  },
} as const;

/**
 * Initializes OpenAI client from environment variables.
 * Throws early if API key is not configured.
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_openai_api_key_here") {
    throw new LLMApiError(
      "OPENAI_API_KEY is not configured or is using placeholder. Please set OPENAI_API_KEY in your environment or .env.local file."
    );
  }
  return new OpenAI({ apiKey: apiKey.trim() });
}

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Executes chat completion with short retry and backoff for transient API-level failures
 * (network dropouts, 429 rate limits, 5xx server errors).
 */
async function callOpenAIWithTransientRetry(
  client: OpenAI,
  messages: ChatMessage[],
  maxApiAttempts = 2
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxApiAttempts; attempt++) {
    try {
      return await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: openAiPageJsonSchema,
        },
        temperature: 0.7,
      });
    } catch (error: any) {
      lastError = error;

      // If it's a 4xx error other than 429 (e.g. invalid auth), do not retry
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw new LLMApiError(
          error.message || `OpenAI client error: ${error.status}`,
          error
        );
      }

      if (attempt < maxApiAttempts) {
        // Exponential/linear backoff (e.g., 750ms)
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    }
  }

  throw new LLMApiError(
    "Transient OpenAI API error. Service is temporarily unavailable or rate limited, please retry.",
    lastError
  );
}

/**
 * Core retry-with-feedback loop for content-level failures (Zod schema mismatches,
 * invalid JSON, empty responses, refusals).
 */
async function executeWithContentFeedbackLoop(
  initialMessages: ChatMessage[]
): Promise<Page> {
  const client = getOpenAIClient();
  const messages: ChatMessage[] = [...initialMessages];
  let lastValidationSummary = "No content returned";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const completion = await callOpenAIWithTransientRetry(client, messages);
    const choice = completion.choices[0];

    if (!choice || !choice.message) {
      lastValidationSummary = "OpenAI response missing completion choice message";
      if (attempt < 3) {
        messages.push({
          role: "user",
          content: "Your response was empty. Please generate valid JSON with exactly 3 blocks: hero, features, and footer.",
        });
        continue;
      }
      break;
    }

    // Check for explicit refusal first
    if (choice.message.refusal) {
      throw new LLMRefusalError(choice.message.refusal);
    }

    const rawContent = choice.message.content;

    // Check for empty content
    if (!rawContent || rawContent.trim() === "") {
      lastValidationSummary = "Model returned empty content";
      if (attempt < 3) {
        messages.push({
          role: "assistant",
          content: rawContent || "",
        });
        messages.push({
          role: "user",
          content: "Your previous response was empty. Return valid JSON adhering to the schema with exactly 3 blocks in order: hero, features, footer.",
        });
        continue;
      }
      break;
    }

    // Attempt JSON parse
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (parseErr: any) {
      lastValidationSummary = `Unparseable JSON: ${parseErr?.message || "SyntaxError"}`;
      if (attempt < 3) {
        messages.push({
          role: "assistant",
          content: rawContent,
        });
        messages.push({
          role: "user",
          content: `Your previous response was not valid JSON (${parseErr?.message || "parse error"}). Please return valid JSON matching the required schema.`,
        });
        continue;
      }
      break;
    }

    // Validate with Zod 3-tuple PageSchema
    const zodResult = PageSchema.safeParse(parsedJson);
    if (zodResult.success) {
      return zodResult.data;
    }

    // Map Zod errors to compact string (path.join("."): message, joined by "; ")
    const issueSummaries = zodResult.error.issues.map((issue) => {
      const pathStr = issue.path.join(".");
      return `${pathStr || "root"}: ${issue.message}`;
    });
    lastValidationSummary = issueSummaries.join("; ");

    if (attempt < 3) {
      messages.push({
        role: "assistant",
        content: rawContent,
      });
      messages.push({
        role: "user",
        content: `The returned JSON failed validation with the following errors: ${lastValidationSummary}. Please return corrected JSON that fixes only these issues while strictly preserving the 3-block order (hero, features, footer) and leaving everything else intact.`,
      });
    }
  }

  throw new LLMGenerationError(
    "Unable to generate schema-conformant page content after 3 attempts.",
    lastValidationSummary
  );
}

const GENERATION_SYSTEM_PROMPT = `You are an expert web content architect.
Generate structured content for a simple webpage based on the user's business description.

CRITICAL STRUCTURAL RULES:
1. The "blocks" array MUST contain EXACTLY 3 items in this STRICT ORDER:
   - Item 0 (index 0): Hero block (type: "hero", heading, subheading)
   - Item 1 (index 1): Features block (type: "features", items: array of 2 to 4 objects with title and description)
   - Item 2 (index 2): Footer block (type: "footer", text)
2. Strictly 3 items only. No extra blocks, no missing blocks, no duplicate blocks.
3. Every heading, feature title, feature description, and footer text must be non-empty and compelling.
4. If no subheading is needed for the hero, set "subheading" to null.
5. Do not include markdown code block formatting; return strictly the JSON structure specified by the schema.`;

const EDIT_SYSTEM_PROMPT = `You are an expert web content editor.
You will receive the full current webpage JSON and a one-line edit instruction from the user.
Update the webpage JSON strictly adhering to the instruction.

CRITICAL EDITING RULES:
1. COPY EVERY FIELD THE INSTRUCTION DID NOT ASK TO CHANGE VERBATIM FROM THE CURRENT JSON.
2. DO NOT rephrase, "improve", polish, or regenerate untouched content.
3. The "blocks" array MUST contain EXACTLY 3 items in this STRICT ORDER: hero, features, footer.
4. The features block must always have between 2 and 4 items.
5. If the hero subheading is omitted or removed, set "subheading" to null.
6. Apply only the requested change while preserving all untouched content verbatim.`;

/**
 * Generates a validated Page from a business description.
 */
export async function generatePage(description: string): Promise<Page> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: GENERATION_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Create a webpage for the following business: "${description.trim()}"`,
    },
  ];

  return executeWithContentFeedbackLoop(messages);
}

/**
 * Edits an existing validated Page based on a user follow-up instruction.
 */
export async function editPage(
  currentPage: Page,
  instruction: string
): Promise<Page> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: EDIT_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Current webpage JSON:
${JSON.stringify(currentPage, null, 2)}

Edit instruction: "${instruction.trim()}"

Remember: Update only the requested field(s). Copy every other field verbatim.`,
    },
  ];

  return executeWithContentFeedbackLoop(messages);
}
