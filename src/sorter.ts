import { DEFAULT_OPTIONS } from "./types";
import { renderImport } from "./renderer";
export type { SortOptions } from "./types";
import { detectEol, findImportBlock } from "./parser";
import type { SortOptions, ResolvedOptions } from "./types";

/**
 * Sort imports
 */
export function sortImports(source: string, options: SortOptions = {}): string {
  const opts: ResolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const block = findImportBlock(source);
  if (!block || block.imports.length === 0) return source;

  const eol = detectEol(source);
  const rendered = block.imports.map((imp) => renderImport(imp, opts, eol));
  const sorted = sortByFromLine(rendered);

  return (
    source.slice(0, block.start) + sorted.join(eol) + source.slice(block.end)
  );
}

/**
 * Sort by from line length
 */
function sortByFromLine(rendered: string[]): string[] {
  return rendered
    .map((text, index) => ({ text, index, key: fromLineLength(text) }))
    .sort((a, b) => (a.key !== b.key ? a.key - b.key : a.index - b.index))
    .map((r) => r.text);
}

/**
 * Get from line length
 */
function fromLineLength(text: string): number {
  const lastNl = text.lastIndexOf("\n");
  return lastNl === -1 ? text.length : text.length - lastNl - 1;
}
