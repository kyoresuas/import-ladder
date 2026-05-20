import type { ImportBlock, ParsedImport, NamedSpecifier } from "./types";

/**
 * Detect end of line
 */
export function detectEol(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Find import block
 */
export function findImportBlock(source: string): ImportBlock | null {
  let pos = 0;

  if (source.charCodeAt(0) === 0xfeff) pos = 1;

  if (source[pos] === "#" && source[pos + 1] === "!") {
    const nl = source.indexOf("\n", pos);
    pos = nl === -1 ? source.length : nl + 1;
  }

  pos = skipWhitespaceAndComments(source, pos);
  pos = skipUseStrict(source, pos);
  pos = skipWhitespaceAndComments(source, pos);

  if (!startsWithImportKeyword(source, pos)) return null;

  const start = pos;
  let end = pos;
  const imports: ParsedImport[] = [];

  while (pos < source.length) {
    pos = skipWhitespaceOnly(source, pos);
    if (!startsWithImportKeyword(source, pos)) break;

    const stmtEnd = findStatementEnd(source, pos);
    if (stmtEnd === -1) break;

    const parsed = parseImport(source.slice(pos, stmtEnd).trim());
    if (!parsed) break;

    imports.push(parsed);
    end = stmtEnd;
    pos = stmtEnd;
  }

  return { start, end, imports };
}

/**
 * Skip whitespace only
 */
function skipWhitespaceOnly(source: string, pos: number): number {
  while (pos < source.length) {
    const ch = source[pos];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      pos++;
    } else {
      break;
    }
  }
  return pos;
}

/**
 * Skip whitespace and comments
 */
function skipWhitespaceAndComments(source: string, pos: number): number {
  while (pos < source.length) {
    const ch = source[pos];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      pos++;
    } else if (source[pos] === "/" && source[pos + 1] === "/") {
      const nl = source.indexOf("\n", pos);
      pos = nl === -1 ? source.length : nl + 1;
    } else if (source[pos] === "/" && source[pos + 1] === "*") {
      const end = source.indexOf("*/", pos + 2);
      pos = end === -1 ? source.length : end + 2;
    } else {
      break;
    }
  }
  return pos;
}

/**
 * Skip use strict
 */
function skipUseStrict(source: string, pos: number): number {
  const match = source.slice(pos).match(/^(['"])use strict\1\s*;?/);
  return match ? pos + match[0].length : pos;
}

/**
 * Starts with import keyword
 */
function startsWithImportKeyword(source: string, pos: number): boolean {
  if (source.slice(pos, pos + 6) !== "import") return false;
  const next = source[pos + 6];
  if (next === undefined) return false;
  return (
    next === " " ||
    next === "\t" ||
    next === "\n" ||
    next === "\r" ||
    next === "{" ||
    next === '"' ||
    next === "'" ||
    next === "*"
  );
}

// Go through the characters, correctly skipping lines and braces, so that we don't
// take ; inside `from "...;..."` or inside `{ }` as the end of the instruction
function findStatementEnd(source: string, start: number): number {
  let pos = start + 6;
  let braceDepth = 0;
  let inString: string | null = null;
  let sawModule = false;

  while (pos < source.length) {
    const ch = source[pos];

    if (inString) {
      if (ch === "\\" && pos + 1 < source.length) {
        pos += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
        if (braceDepth === 0) sawModule = true;
      }
      pos++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      pos++;
      continue;
    }

    if (ch === "{") {
      braceDepth++;
      pos++;
      continue;
    }

    if (ch === "}") {
      braceDepth--;
      pos++;
      continue;
    }

    if (braceDepth === 0 && ch === ";") return pos + 1;

    // ASI: import without `;` ends on a line break after the module line
    if (braceDepth === 0 && ch === "\n" && sawModule) return pos;

    pos++;
  }

  return sawModule ? pos : -1;
}

/**
 * Parse import
 */
function parseImport(text: string): ParsedImport | null {
  let body = text.trim();
  if (!body.startsWith("import")) return null;
  body = body.slice(6).trim();
  if (body.endsWith(";")) body = body.slice(0, -1).trim();

  const sideEffect = body.match(/^["']([^"']+)["']$/);
  if (sideEffect) {
    return {
      module: sideEffect[1],
      namedImports: [],
      isSideEffect: true,
      isTypeOnly: false,
      hasEmptyBraces: false,
    };
  }

  let isTypeOnly = false;
  const typePrefix = body.match(/^type[\s\n]+/);
  if (typePrefix) {
    isTypeOnly = true;
    body = body.slice(typePrefix[0].length).trim();
  }

  const fromMatch = body.match(/[\s\n]from[\s\n]+["']([^"']+)["']$/);
  if (!fromMatch) return null;

  const module = fromMatch[1];
  let clauses = body.slice(0, body.length - fromMatch[0].length).trim();

  const result: ParsedImport = {
    module,
    namedImports: [],
    isSideEffect: false,
    isTypeOnly,
    hasEmptyBraces: false,
  };

  if (!clauses.startsWith("{") && !clauses.startsWith("*")) {
    const defMatch = clauses.match(/^([$_A-Za-z][$_A-Za-z0-9]*)/);
    if (defMatch) {
      result.defaultImport = defMatch[1];
      clauses = clauses.slice(defMatch[0].length).trim();
      if (clauses.startsWith(",")) clauses = clauses.slice(1).trim();
    }
  }

  if (clauses.startsWith("*")) {
    const nsMatch = clauses.match(/^\*\s+as\s+([$_A-Za-z][$_A-Za-z0-9]*)/);
    if (!nsMatch) return null;
    result.namespaceImport = `* as ${nsMatch[1]}`;
    clauses = clauses.slice(nsMatch[0].length).trim();
    if (clauses.startsWith(",")) clauses = clauses.slice(1).trim();
  }

  if (clauses.startsWith("{")) {
    const closeBrace = clauses.lastIndexOf("}");
    if (closeBrace === -1) return null;
    const inner = clauses.slice(1, closeBrace);
    result.namedImports = parseNamedSpecifiers(inner);
    if (result.namedImports.length === 0) result.hasEmptyBraces = true;
    clauses = clauses.slice(closeBrace + 1).trim();
  }

  if (clauses.length > 0) return null;

  return result;
}

/**
 * Parse named specifiers
 */
function parseNamedSpecifiers(text: string): NamedSpecifier[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const typeMatch = s.match(/^type[\s\n]+/);
      if (typeMatch) {
        return { name: s.slice(typeMatch[0].length).trim(), isType: true };
      }
      return { name: s, isType: false };
    });
}
