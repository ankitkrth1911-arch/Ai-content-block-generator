import React from "react";
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

  const isChanged = (path: string) => changedFieldPaths.includes(path);

  // Dynamic responsive columns based on item count (2 to 4)
  const gridColsClass =
    features.items.length === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-4xl"
      : features.items.length === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl";

  return (
    <article className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* 1. HERO BLOCK */}
      <section className="w-full bg-slate-900 text-white py-16 px-6 sm:px-12 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div>
            <h1
              className={`text-3xl sm:text-5xl font-extrabold tracking-tight transition-all duration-1000 ${
                isChanged("blocks.0.heading")
                  ? "bg-amber-400/30 ring-2 ring-amber-300 rounded-lg px-3 py-1 inline-block"
                  : "bg-transparent ring-0"
              }`}
            >
              {hero.heading}
            </h1>
          </div>

          {hero.subheading && (
            <div>
              <p
                className={`text-lg sm:text-xl text-slate-300 font-light leading-relaxed transition-all duration-1000 ${
                  isChanged("blocks.0.subheading")
                    ? "bg-amber-400/30 text-white ring-2 ring-amber-300 rounded-lg px-3 py-1 inline-block"
                    : "bg-transparent ring-0"
                }`}
              >
                {hero.subheading}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 2. FEATURES BLOCK */}
      <section className="py-14 px-6 sm:px-12 bg-slate-50/70 dark:bg-slate-900/40">
        <div className={`grid gap-6 mx-auto ${gridColsClass}`}>
          {features.items.map((item, index) => {
            const titlePath = `blocks.1.items.${index}.title`;
            const descPath = `blocks.1.items.${index}.description`;

            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <h2
                    className={`text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 transition-all duration-1000 ${
                      isChanged(titlePath)
                        ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 rounded-md px-2 py-0.5 inline-block"
                        : "bg-transparent ring-0"
                    }`}
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed transition-all duration-1000 ${
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
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 px-6 text-center">
        <p
          className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 transition-all duration-1000 ${
            isChanged("blocks.2.text")
              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 rounded-md px-2 py-1 inline-block"
              : "bg-transparent ring-0"
          }`}
        >
          {footer.text}
        </p>
      </footer>
    </article>
  );
};
