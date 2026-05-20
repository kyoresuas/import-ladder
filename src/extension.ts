import * as vscode from "vscode";
import { sortImports } from "./sorter";
import type { SortOptions } from "./types";

// Supported languages
const SUPPORTED_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "typescriptreact",
  "javascriptreact",
]);

// Sort imports kind
const SORT_IMPORTS_KIND =
  vscode.CodeActionKind.Source.append("sortImports").append("ladder");

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("sortImport.sort", runSortCommand),
    ...registerProviders(),
    registerSaveHandler(),
  );
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {}

/**
 * Sort imports provider
 */
class SortImportsProvider implements vscode.CodeActionProvider {
  static readonly providedKinds = [SORT_IMPORTS_KIND];

  /**
   * Provide code actions
   */
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] | undefined {
    if (!SUPPORTED_LANGUAGES.has(document.languageId)) return;
    if (
      context.only &&
      !SORT_IMPORTS_KIND.intersects(context.only) &&
      !vscode.CodeActionKind.Source.intersects(context.only)
    ) {
      return;
    }

    const oldText = document.getText();
    const newText = sortImports(oldText, readOptions());
    if (oldText === newText) return [];

    const action = new vscode.CodeAction(
      "Sort Imports (Ladder)",
      SORT_IMPORTS_KIND,
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange(document, oldText), newText);
    action.edit = edit;
    return [action];
  }
}

/**
 * Run sort command
 */
async function runSortCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  if (!SUPPORTED_LANGUAGES.has(editor.document.languageId)) return;

  const oldText = editor.document.getText();
  const newText = sortImports(oldText, readOptions());
  if (oldText === newText) return;

  await editor.edit((eb) =>
    eb.replace(fullRange(editor.document, oldText), newText),
  );
}

/**
 * Register providers
 */
function registerProviders(): vscode.Disposable[] {
  return [...SUPPORTED_LANGUAGES].map((lang) =>
    vscode.languages.registerCodeActionsProvider(
      { language: lang },
      new SortImportsProvider(),
      { providedCodeActionKinds: SortImportsProvider.providedKinds },
    ),
  );
}

/**
 * Register save handler
 */
function registerSaveHandler(): vscode.Disposable {
  const inFlight = new Set<string>();

  // Prevent infinite recursion: after our save, another onDidSave will fire,
  // and without this flag we'll get an infinite loop of sort -> save -> sort
  return vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const config = vscode.workspace.getConfiguration("sortImport");
    if (!config.get<boolean>("formatOnSave", false)) return;
    if (!SUPPORTED_LANGUAGES.has(doc.languageId)) return;

    const key = doc.uri.toString();
    if (inFlight.has(key)) return;

    const oldText = doc.getText();
    const newText = sortImports(oldText, readOptions());
    if (oldText === newText) return;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(doc.uri, fullRange(doc, oldText), newText);

    inFlight.add(key);
    try {
      if (await vscode.workspace.applyEdit(edit)) {
        await doc.save();
      }
    } finally {
      inFlight.delete(key);
    }
  });
}

/**
 * Get full range of document
 */
function fullRange(doc: vscode.TextDocument, text: string): vscode.Range {
  return new vscode.Range(doc.positionAt(0), doc.positionAt(text.length));
}

/**
 * Read options
 */
function readOptions(): SortOptions {
  const config = vscode.workspace.getConfiguration("sortImport");
  const useTabs = config.get<boolean>("useTabs", false);
  const indentSize = config.get<number>("indentSize", 2);
  return {
    printWidth: config.get<number>("printWidth", 80),
    quote: config.get<'"' | "'">("quote", '"'),
    indent: useTabs ? "\t" : " ".repeat(Math.max(1, indentSize)),
  };
}
