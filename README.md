# AI Content Block Generator

A full-stack single-page web application built with **Next.js 14 (App Router, TypeScript)**, **Tailwind CSS**, **Zod**, and **Groq's OpenAI-compatible API** (`openai/gpt-oss-120b`).

A user enters a one-line business description, the application generates a structured 3-block webpage (Hero, Features, Footer) using strict Structured Outputs, validates the result with a strict 3-tuple Zod schema, renders it live as a styled webpage, and allows exactly one follow-up in-place edit with animated field-level change highlighting.

---

## Architecture & Data Contract

The webpage layout contract is strictly fixed:
```
[ HeroBlock, FeaturesBlock, FooterBlock ]
```

- **Hero Block**:
  - `type`: `"hero"`
  - `heading`: Non-empty string
  - `subheading`: Optional/nullable string (accepts `undefined`, `null`, or `""` and normalizes to `undefined`)
- **Features Block**:
  - `type`: `"features"`
  - `items`: Fixed array of 2 to 4 objects, each with `title` and `description`
- **Footer Block**:
  - `type`: `"footer"`
  - `text`: Non-empty string

---

## Project Structure

```
app/
  page.tsx                 – Client UI: description input, preview, single follow-up edit, JSON viewer
  layout.tsx, globals.css  – Root layout and Tailwind CSS configuration
  api/generate/route.ts    – POST /api/generate endpoint with input validation and error mapping
  api/edit/route.ts        – POST /api/edit endpoint with payload validation and error mapping
components/
  PageRenderer.tsx         – Renders validated Page blocks with field-level change highlight animations
lib/
  schema.ts                – Strict 3-tuple Zod schema (PageSchema runtime source of truth)
  llm.ts                   – Groq client (OpenAI SDK compatible), structured outputs schema, transient retry & feedback loop
.env.example               – Template for environment configuration (GROQ_API_KEY)
.gitignore                 – Git exclusion rules (node_modules, .next, .env*, scratch/)
README.md                  – Architectural documentation and local setup guide
```

---

## Getting Started

### Prerequisites
- Node.js 18.17+ (Node.js 20+ or 24+ recommended)
- npm, yarn, or pnpm
- A **Free Groq API Key** from [console.groq.com/keys](https://console.groq.com/keys) (Free tier, zero cost, no credit card required)

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory (based on `.env.example`):
```bash
cp .env.example .env.local
```

Open `.env.local` and add your Groq API key:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```

### 3. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
Verify the production build:
```bash
npm run build
npm run start
```

---

## Key Technical Design & Assumptions

1. **Zero-Cost LLM Infrastructure via Groq**:
   - Groq provides a free developer tier (~30 requests/minute, 1,000+ requests/day) with zero cost and no credit card required.
   - Because Groq exposes an OpenAI-compatible API (`https://api.groq.com/openai/v1`), the official `openai` SDK is preserved directly without switching client libraries.
   - We utilize `openai/gpt-oss-120b` (with `moonshotai/kimi-k2-instruct-0905` as documented alternative), which supports strict JSON schema structured outputs.

2. **Strict 3-Tuple Contract Enforced by Zod**:
   - Strict Structured Outputs modes enforce key schemas but do not express positional tuples or per-index variant schemas.
   - We utilize a **two-layer schema strategy**:
     - *Layer 1 (Model-facing)*: A JSON Schema array of blocks where each element is an `anyOf` union of Hero, Features, and Footer schemas (with all properties listed in `required`, `additionalProperties: false`, and optional fields typed as `["string", "null"]`).
     - *Layer 2 (Runtime Source of Truth)*: `PageSchema` defined in Zod as `z.tuple([HeroBlockSchema, FeaturesBlockSchema, FooterBlockSchema])`. Even if the model outputs blocks in the wrong order or omits a block, `PageSchema.safeParse()` strictly rejects it.

3. **Retry-With-Feedback Loop**:
   - **Transient API Failures**: Network dropouts, HTTP 429 rate limits, and 5xx errors are wrapped in a separate fast retry loop with backoff (up to 2 attempts). If exhausted, it throws `LLMApiError` mapping to HTTP `503`.
   - **Content-Level Failures**: If the model returns an explicit refusal (`message.refusal`), empty content, unparseable JSON, or fails Zod validation:
     - The exact Zod error paths and messages (e.g. `blocks.1.items: Features block must have at least 2 items`) are collected.
     - The prior assistant response is appended to the conversation history, followed by a targeted user corrective prompt asking the model to fix only those specific paths while preserving block order.
     - Retries up to 3 total attempts. If validation still fails, throws `LLMGenerationError` mapping to HTTP `502` with friendly diagnostic details.

4. **Single Follow-Up Edit Semantics**:
   - The user is allowed exactly one follow-up instruction per generated page.
   - When an edit succeeds, the UI transitions the edit input into a visibly **spent** state: the controls remain visible but disabled, accompanied by an explanatory caption explaining that a new page must be generated to edit again.
   - If an edit fails, the previously rendered page remains completely intact (state is never wiped on failed follow-ups), and a clear red error banner (`role="alert"`) surfaces the error.

5. **Field-Level Diff & Visual Highlight**:
   - On a successful edit, the client performs an explicit keyed comparison between the previous `Page` object and the new `Page` object.
   - The exact dot-separated field paths that changed (e.g. `blocks.0.heading`, `blocks.1.items.0.description`) are tracked and highlighted with a temporary amber/yellow CSS transition that smoothly fades back to transparent over 2.5 seconds.

---

## Trade-offs Made

- **Provider Switch to Groq**: Groq was chosen specifically to keep the application 100% free and accessible without a credit card requirement during development and review. By utilizing Groq's OpenAI-compatible endpoint, the entire downstream architecture (strict structured outputs, 3-tuple validation, retry feedback loop, and editing) remained entirely untouched, demonstrating clean interface decoupling.
- **Structured Outputs vs. Plain JSON Prompting**: Using `strict: true` JSON schema ensures the LLM's token generation is constrained by grammar at the token sampling level, eliminating syntax errors and hallucinated keys compared to markdown-fenced prompting.
- **Two-Layer Schema Model**: Because strict mode cannot enforce positional tuples or array lengths, we use a looser `anyOf` schema for the model combined with a rigid Zod 3-tuple as the runtime authority.
- **Full-Page Context Resend vs. Patch/Diff Semantics**: For the follow-up edit, we resend the entire existing page JSON and prompt the model to copy untouched fields verbatim. While JSON patch/diff operations consume fewer output tokens, full-page resending avoids client-side patch application failures and ensures the entire page remains mutually coherent and verifiable by `PageSchema`.
- **No Streaming**: Generating a complete JSON document that must pass full Zod schema validation before rendering means streaming raw partial JSON offers minimal UI value without complex speculative JSON parsers.

---

## What I'd Improve With More Time

1. **Mechanical Diff Guardrails**: Implement server-side verification in `/api/edit` that compares the submitted page and the returned page against the instruction, rejecting unintended changes to unrelated sections before sending back to the client.
2. **Streaming & Progressive Rendering**: Use partial JSON stream parsing to render blocks progressively as they complete validation.
3. **Multi-Step Edit History with Undo/Redo**: Expand beyond single-use edits to support an undo/redo timeline stack.
4. **Automated Schema Edge-Case Test Suite**: Add comprehensive Vitest/Jest unit tests covering malformed blocks, out-of-order blocks, empty string fallbacks, and boundary conditions (1 vs 2 vs 5 feature items).
5. **Rate Limiting & Abuse Prevention**: Implement IP-based rate limiting on `/api/generate` and `/api/edit` to protect against API key quota exhaustion.
