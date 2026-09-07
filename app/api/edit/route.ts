import { NextRequest, NextResponse } from "next/server";
import { editPage, LLMApiError, LLMGenerationError, LLMRefusalError } from "@/lib/llm";
import { PageSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body provided in request." },
        { status: 400 }
      );
    }

    const { currentPage, instruction } = body || {};

    // Validate instruction
    if (typeof instruction !== "string" || instruction.trim().length === 0) {
      return NextResponse.json(
        { error: "Edit instruction is required and cannot be empty." },
        { status: 400 }
      );
    }

    if (instruction.trim().length > 300) {
      return NextResponse.json(
        {
          error: `Edit instruction exceeds the 300 character limit (current: ${instruction.trim().length}).`,
        },
        { status: 400 }
      );
    }

    // Validate currentPage against PageSchema (guards against malformed/tampered client payload)
    const pageValidation = PageSchema.safeParse(currentPage);
    if (!pageValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid current page structure provided for editing.",
          details: pageValidation.error.issues
            .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
            .join("; "),
        },
        { status: 400 }
      );
    }

    const updatedPage = await editPage(pageValidation.data, instruction.trim());
    return NextResponse.json({ page: updatedPage }, { status: 200 });
  } catch (err: any) {
    if (err instanceof LLMGenerationError) {
      return NextResponse.json(
        {
          error: err.message,
          details: err.details,
        },
        { status: 502 }
      );
    }

    if (err instanceof LLMApiError) {
      return NextResponse.json(
        {
          error: err.message,
        },
        { status: 503 }
      );
    }

    if (err instanceof LLMRefusalError) {
      return NextResponse.json(
        {
          error: err.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: err?.message || "An unexpected server error occurred during page editing.",
      },
      { status: 500 }
    );
  }
}
