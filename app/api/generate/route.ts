import { NextRequest, NextResponse } from "next/server";
import { generatePage, LLMApiError, LLMGenerationError, LLMRefusalError } from "@/lib/llm";

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

    const { description } = body || {};

    // Validate description presence and type
    if (typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Business description is required and cannot be empty." },
        { status: 400 }
      );
    }

    // Validate max length constraint (~300 chars)
    if (description.trim().length > 300) {
      return NextResponse.json(
        {
          error: `Description exceeds the 300 character limit (current: ${description.trim().length}).`,
        },
        { status: 400 }
      );
    }

    const page = await generatePage(description.trim());
    return NextResponse.json({ page }, { status: 200 });
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
        error: err?.message || "An unexpected server error occurred during page generation.",
      },
      { status: 500 }
    );
  }
}
