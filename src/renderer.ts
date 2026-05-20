import type { ParsedImport, NamedSpecifier, ResolvedOptions } from "./types";

/**
 * Render import
 */
export function renderImport(
  imp: ParsedImport,
  opts: ResolvedOptions,
  eol: string,
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

  const singleLine = `import ${typePrefix}${clauseParts.join(", ")} from ${q}${imp.module}${q};`;

  if (singleLine.length <= opts.printWidth || namedStrings.length <= 1) {
    return singleLine;
  }

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
