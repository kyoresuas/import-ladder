import { DEFAULT_OPTIONS } from "./types";
import { detectEol, findImportBlock } from "./parser";
import { renderImport, importSortKey } from "./renderer";
import type { SortOptions, ResolvedOptions } from "./types";

/**
 * Sort imports
 */
export function sortImports(source: string, options: SortOptions = {}): string {
  const opts: ResolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const block = findImportBlock(source);
  if (!block || block.imports.length === 0) return source;

  const eol = detectEol(source);
  const sorted = block.imports
    .map((imp, index) => ({
      text: renderImport(imp, opts, eol),
      index,
      key: importSortKey(imp, opts),
    }))
    .sort((a, b) => (a.key !== b.key ? a.key - b.key : a.index - b.index))
    .map((r) => r.text);

  return (
    source.slice(0, block.start) + sorted.join(eol) + source.slice(block.end)
  );
}
