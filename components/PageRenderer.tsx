"use client";

import React, { useRef } from "react";
import { Page } from "@/lib/schema";

interface PageRendererProps {
  page: Page;
  changedFieldPaths?: string[];
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  page,
  changedFieldPaths = [],
}) => {
  const [hero, features, footer] = page.blocks;
  const featuresRef = useRef<HTMLElement>(null);

  const isChanged = (path: string) => changedFieldPaths.includes(path);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Dynamic responsive columns based on item count (2 to 4)
  const gridColsClass =
    features.items.length === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-4xl"
      : features.items.length === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl";

  return (
    <article className="w-full bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* 1. HERO BLOCK */}
      <section className="relative w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-20 sm:py-28 px-6 sm:px-12 text-center overflow-hidden border-b border-slate-800/80">
        {/* Subtle CSS radial glow for depth without external assets */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none"
        />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div>
            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] transition-all duration-1000 ${
                isChanged("blocks.0.heading")
                  ? "bg-amber-400/25 ring-2 ring-amber-300 rounded-lg px-3 py-1 inline-block"
                  : "bg-transparent ring-0"
              }`}
            >
              {hero.heading}
            </h1>
          </div>

          {hero.subheading && (
            <div className="pt-1">
              <p
                className={`text-lg sm:text-xl text-slate-300/90 font-normal leading-relaxed max-w-2xl mx-auto transition-all duration-1000 ${
                  isChanged("blocks.0.subheading")
                    ? "bg-amber-400/25 text-white ring-2 ring-amber-300 rounded-lg px-3 py-1 inline-block"
                    : "bg-transparent ring-0"
                }`}
              >
                {hero.subheading}
              </p>
            </div>
          )}

          {/* Smooth-scroll interactive button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/15 hover:border-white/25 transition-all shadow-sm active:scale-95 cursor-pointer backdrop-blur-sm group"
            >
              <span>See what we offer</span>
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-y-0.5 transition-all"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 2. FEATURES BLOCK */}
      <section
        id="features-section"
        ref={featuresRef}
        className="py-16 sm:py-24 px-6 sm:px-12 bg-slate-50/80 dark:bg-slate-900/50"
      >
        <div className={`grid gap-6 sm:gap-8 mx-auto ${gridColsClass}`}>
          {features.items.map((item, index) => {
            const titlePath = `blocks.1.items.${index}.title`;
            const descPath = `blocks.1.items.${index}.description`;

            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-7 sm:p-8 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Subtle icon badge visual anchor */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      {index % 4 === 0 && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      )}
                      {index % 4 === 1 && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      )}
                      {index % 4 === 2 && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      )}
                      {index % 4 === 3 && (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      )}
                    </svg>
                  </div>

                  <h2
                    className={`text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2.5 transition-all duration-1000 ${
                      isChanged(titlePath)
                        ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 rounded-md px-2 py-0.5 inline-block"
                        : "bg-transparent ring-0"
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed font-normal transition-all duration-1000 ${
                      isChanged(descPath)
                        ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 rounded-md px-2 py-0.5 inline-block"
                        : "bg-transparent ring-0"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FOOTER BLOCK */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 sm:py-10 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p
            className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide transition-all duration-1000 ${
              isChanged("blocks.2.text")
                ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 rounded-md px-2.5 py-1 inline-block"
                : "bg-transparent ring-0"
            }`}
          >
            {footer.text}
          </p>
        </div>
      </footer>
    </article>
  );
};
