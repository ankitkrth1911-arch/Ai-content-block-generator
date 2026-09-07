"use client";

import { useState, useTransition } from "react";
import { Page } from "@/lib/schema";
import { PageRenderer } from "@/components/PageRenderer";

/**
 * Explicit keyed comparison over the fixed 3-tuple shape:
 * [Hero, Features, Footer]
 * Returns exact dot-separated paths for any field that changed.
 */
function computeFieldDiff(prev: Page, next: Page): string[] {
  const changed: string[] = [];

  // 1. Hero block checks
  if (prev.blocks[0].heading !== next.blocks[0].heading) {
    changed.push("blocks.0.heading");
  }
  if (prev.blocks[0].subheading !== next.blocks[0].subheading) {
    changed.push("blocks.0.subheading");
  }

  // 2. Features block checks
  const prevItems = prev.blocks[1].items;
  const nextItems = next.blocks[1].items;
  const maxLen = Math.max(prevItems.length, nextItems.length);

  for (let i = 0; i < maxLen; i++) {
    const prevItem = prevItems[i];
    const nextItem = nextItems[i];
    if (!prevItem || !nextItem) {
      changed.push(`blocks.1.items.${i}.title`, `blocks.1.items.${i}.description`);
    } else {
      if (prevItem.title !== nextItem.title) {
        changed.push(`blocks.1.items.${i}.title`);
      }
      if (prevItem.description !== nextItem.description) {
        changed.push(`blocks.1.items.${i}.description`);
      }
    }
  }

  // 3. Footer block checks
  if (prev.blocks[2].text !== next.blocks[2].text) {
    changed.push("blocks.2.text");
  }

  return changed;
}

export default function Home() {
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");

  const [page, setPage] = useState<Page | null>(null);
  const [changedFieldPaths, setChangedFieldPaths] = useState<string[]>([]);
  const [hasEdited, setHasEdited] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const [error, setError] = useState<{
    message: string;
    details?: string;
  } | null>(null);

  // Generate handler
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || `Generation failed (HTTP ${res.status})`,
          details: data.details,
        });
        return;
      }

      setPage(data.page);
      setHasEdited(false);
      setChangedFieldPaths([]);
      setInstruction("");
    } catch (err: any) {
      setError({
        message: err?.message || "Failed to communicate with generation server.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit handler
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page || hasEdited || !instruction.trim() || isEditing) return;

    setIsEditing(true);
    setError(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage: page,
          instruction: instruction.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Crucial requirement: Leave previously rendered page untouched on error
        setError({
          message: data.error || `Edit failed (HTTP ${res.status})`,
          details: data.details,
        });
        return;
      }

      // Compute field-level differences between old and new state
      const diffPaths = computeFieldDiff(page, data.page);
      setChangedFieldPaths(diffPaths);
      setPage(data.page);
      setHasEdited(true);
      setInstruction("");

      // Revert highlight after 2.5 seconds
      setTimeout(() => {
        setChangedFieldPaths([]);
      }, 2500);
    } catch (err: any) {
      setError({
        message: err?.message || "Failed to communicate with edit server.",
      });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Strict 3-Tuple Structured Outputs
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            AI Content Block Generator
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Describe any business to generate a validated 3-block webpage (Hero,
            Features, Footer). You get exactly one follow-up in-place edit with
            field-level change tracking.
          </p>
        </header>

        {/* Error Alert Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-900 dark:text-red-200 shadow-sm flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error.message}
              </span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs font-semibold text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
            {error.details && (
              <p className="text-xs text-red-800 dark:text-red-300 pl-7 font-mono break-words">
                Details: {error.details}
              </p>
            )}
          </div>
        )}

        {/* 1. Generate Form Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <label
              htmlFor="business-description"
              className="block text-sm font-bold text-slate-800 dark:text-slate-200"
            >
              Business Description
            </label>
            <span
              className={`text-xs ${
                description.length > 300
                  ? "text-red-600 font-bold"
                  : "text-slate-400"
              }`}
            >
              {description.length} / 300
            </span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="business-description"
                type="text"
                placeholder="e.g. A cozy neighborhood coffee shop specializing in artisanal roast"
                value={description}
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={
                  isGenerating ||
                  !description.trim() ||
                  description.length > 300
                }
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold text-sm shadow transition-colors disabled:cursor-not-allowed shrink-0"
              >
                {isGenerating ? "Generating…" : "Generate Page"}
              </button>
            </div>
          </form>
        </section>

        {/* Rendered Live Webpage Preview */}
        {page && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live Page Preview
                </h2>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                  3 Blocks Validated
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {showJson ? "Hide JSON" : "View JSON"}
              </button>
            </div>

            {/* Live Webpage Renderer */}
            <PageRenderer page={page} changedFieldPaths={changedFieldPaths} />

            {/* Collapsible View JSON Inspector */}
            {showJson && (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 shadow-inner space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Validated Page JSON (tuple contract compliant)</span>
                  <span>{JSON.stringify(page).length} bytes</span>
                </div>
                <pre className="text-emerald-400 text-xs font-mono overflow-x-auto p-2 bg-slate-900 rounded">
                  {JSON.stringify(page, null, 2)}
                </pre>
              </div>
            )}

            {/* 2. Follow-Up Edit Section (Single Edit Allowed) */}
            <section
              className={`rounded-2xl p-6 border transition-all ${
                hasEdited
                  ? "bg-slate-50 dark:bg-slate-850/50 border-slate-300 dark:border-slate-700/60 opacity-85"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="followup-instruction"
                      className="text-sm font-bold text-slate-800 dark:text-slate-200"
                    >
                      Single Follow-Up Edit
                    </label>
                    {hasEdited ? (
                      <span className="text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        1/1 Edit Used
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                        1 Available
                      </span>
                    )}
                  </div>
                  {!hasEdited && (
                    <span
                      className={`text-xs ${
                        instruction.length > 300
                          ? "text-red-600 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {instruction.length} / 300
                    </span>
                  )}
                </div>

                <form onSubmit={handleEdit} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      id="followup-instruction"
                      type="text"
                      placeholder={
                        hasEdited
                          ? "Edit limit reached for this generated page."
                          : "e.g. Make the heading shorter, or add another feature card"
                      }
                      value={instruction}
                      maxLength={300}
                      onChange={(e) => setInstruction(e.target.value)}
                      disabled={hasEdited || isEditing}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                        hasEdited
                          ? "bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={
                        hasEdited ||
                        isEditing ||
                        !instruction.trim() ||
                        instruction.length > 300
                      }
                      className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold text-sm shadow transition-colors disabled:cursor-not-allowed shrink-0"
                    >
                      {isEditing ? "Updating…" : "Apply Edit"}
                    </button>
                  </div>
                </form>

                {/* Explanatory Caption When Spent */}
                {hasEdited && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    You have used your 1 follow-up edit for this page. Generate
                    a new page above to start fresh and edit again.
                  </p>
                )}
              </div>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
