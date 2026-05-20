import type { ParsedImport, NamedSpecifier, ResolvedOptions } from "./types";

/**
 * Render a single-line import
 */
export function renderImportSingleLine(
  imp: ParsedImport,
  opts: ResolvedOptions,
): string {
  const q = opts.quote;

  if (imp.isSideEffect) {
    return `import ${q}${imp.module}${q};`;
  }

  const typePrefix = imp.isTypeOnly ? "type " : "";
  const sortedNamed = sortNamedSpecifiers(imp.namedImports);
  const namedStrings = sortedNamed.map((n) =>
    n.isType ? `type ${n.name}` : n.name,
  );

  const clauseParts: string[] = [];
  if (imp.defaultImport) clauseParts.push(imp.defaultImport);
  if (imp.namespaceImport) clauseParts.push(imp.namespaceImport);

  if (namedStrings.length > 0) {
    clauseParts.push(`{ ${namedStrings.join(", ")} }`);
  } else if (imp.hasEmptyBraces) {
    clauseParts.push("{}");
  }

  return `import ${typePrefix}${clauseParts.join(", ")} from ${q}${imp.module}${q};`;
}

/**
 * Get the sort key for an import
 */
export function importSortKey(
  imp: ParsedImport,
  opts: ResolvedOptions,
): number {
  return renderImportSingleLine(imp, opts).length;
}

/**
 * Render import
 */
export function renderImport(
  imp: ParsedImport,
  opts: ResolvedOptions,
  eol: string,
): string {
  const singleLine = renderImportSingleLine(imp, opts);
  const namedCount = imp.namedImports.length;

  if (singleLine.length <= opts.printWidth || namedCount === 0) {
    return singleLine;
  }

  const q = opts.quote;
  const typePrefix = imp.isTypeOnly ? "type " : "";
  const sortedNamed = sortNamedSpecifiers(imp.namedImports);
  const namedStrings = sortedNamed.map((n) =>
    n.isType ? `type ${n.name}` : n.name,
  );

  const clauseParts: string[] = [];
  if (imp.defaultImport) clauseParts.push(imp.defaultImport);
  if (imp.namespaceImport) clauseParts.push(imp.namespaceImport);

  const multilineNamed =
    "{" +
    eol +
    namedStrings.map((n) => `${opts.indent}${n},`).join(eol) +
    eol +
    "}";
  const multiClauses = clauseParts.slice(0, -1).concat(multilineNamed);
  return `import ${typePrefix}${multiClauses.join(", ")} from ${q}${imp.module}${q};`;
}

/**
 * Sort named specifiers
 */
function sortNamedSpecifiers(items: NamedSpecifier[]): NamedSpecifier[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aLen = (a.item.isType ? 5 : 0) + a.item.name.length;
      const bLen = (b.item.isType ? 5 : 0) + b.item.name.length;
      if (aLen !== bLen) return aLen - bLen;
      const byName = a.item.name.localeCompare(b.item.name);
      if (byName !== 0) return byName;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
