export interface SortOptions {
  printWidth?: number;
  indent?: string;
  quote?: '"' | "'";
}

export interface ResolvedOptions {
  printWidth: number;
  indent: string;
  quote: '"' | "'";
}

export interface NamedSpecifier {
  name: string;
  isType: boolean;
}

export interface ParsedImport {
  defaultImport?: string;
  namespaceImport?: string;
  namedImports: NamedSpecifier[];
  module: string;
  isSideEffect: boolean;
  isTypeOnly: boolean;
  hasEmptyBraces: boolean;
}

export interface ImportBlock {
  start: number;
  end: number;
  imports: ParsedImport[];
}

export const DEFAULT_OPTIONS: ResolvedOptions = {
  printWidth: 80,
  indent: "  ",
  quote: '"',
};
