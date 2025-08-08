import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.join('resources', 'views', 'components');

/**
 * Document selector: strictly for PHP files with .view.php extension.
 */
const selector: vscode.DocumentSelector = [
  { language: 'php', scheme: 'file', pattern: '**/*.view.php' }
];

export function activate(context: vscode.ExtensionContext) {
  console.log('view-php extension activated');

  	const snippetProvider = vscode.languages.registerCompletionItemProvider(
		  selector, // same selector: php + pattern **/*.view.php
      {
        provideCompletionItems(document, position) {
          // context checks
          const items: vscode.CompletionItem[] = [];

          const ifSnippet = new vscode.CompletionItem('if', vscode.CompletionItemKind.Snippet);
          ifSnippet.insertText = new vscode.SnippetString('@if (${1:condition})\n\t$0\n@endif');
          ifSnippet.detail = 'ViewPHP @if ... @endif';
          items.push(ifSnippet);

          const forSnippet = new vscode.CompletionItem('foreach', vscode.CompletionItemKind.Snippet);
          forSnippet.insertText = new vscode.SnippetString('@foreach (${1:condition})\n\t$0\n@endforeach');
          forSnippet.detail = 'ViewPHP @foreach ... @endforeach';
          items.push(forSnippet);

          const componentSnippet = new vscode.CompletionItem('c-', vscode.CompletionItemKind.Snippet);
          componentSnippet.insertText = new vscode.SnippetString('<c-${1:component} ${2:attr}="${3:value}">\n\t$0\n</c-${1:component}>');
          componentSnippet.detail = 'ViewPHP component tag';
          items.push(componentSnippet);

          const interp = new vscode.CompletionItem('{{', vscode.CompletionItemKind.Snippet);
          interp.insertText = new vscode.SnippetString('{{ ${1:expr} }}');
          interp.detail = 'Interpolation';
          items.push(interp);

          return items;
        }
      },
      '@', '<', '{' // trigger characters
    );

  // Completion Provider for <c-* tags (dot and hyphen based namespaces)
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    selector,
    {
      async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const line = document.lineAt(position.line).text;
        const prefix = line.slice(0, position.character);

        // Only trigger when user types something like "<c-", "c-", "<c-nav.", "<c-nav-"
        // We try to find the fragment immediately before the cursor matching "<c-[\w\-.]*"
        const m = prefix.match(/<c-([\w.\-]*)$/);
        if (!m) {
          return undefined;
        }
        const typed = m[1]; // Ex: "nav.b"

        // Resolve workspace root
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
          return undefined;
        }

        // Compute dir we are inside
        const parts = typed.split(/[\.]/).filter(Boolean);
        const last = parts.length ? parts[parts.length - 1] : '';
        const parentPath = path.join(root, COMPONENTS_DIR, ...parts.slice(0, -1));

        // If path doesn't exist, try root components folder
        const listDir = fs.existsSync(parentPath) ? parentPath : path.join(root, COMPONENTS_DIR, ...parts.slice(0, -1));

        if (!fs.existsSync(listDir)) {
          // fallback: list root components folder
          const fallback = path.join(root, COMPONENTS_DIR);
          if (!fs.existsSync(fallback)) {
            return undefined;
          }
          return buildCompletionItemsFromDir(fallback, typed);
        }

        return buildCompletionItemsFromDir(listDir, typed);
      }
    },
    '.', '-', '<' // trigger characters
  );

  // Hover provider for <c-...>
  const hoverProvider = vscode.languages.registerHoverProvider(
    selector,
    {
      provideHover(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /c-[\w.\-]+/);
        if (!range) {
          return undefined;
        }
        const tag = document.getText(range);
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
          return undefined;
        }

        const compPath = tag.replace(/^c-/, '').replace(/[.\-]/g, path.sep);
        const full = path.join(root, COMPONENTS_DIR, compPath + '.view.php');
        if (fs.existsSync(full)) {
          const rel = path.relative(root, full);
          const md = new vscode.MarkdownString();
          md.appendCodeblock(`Component: ${rel}`, 'plaintext');
          md.appendMarkdown(`\n\n[Open definition](command:editor.action.revealDefinition)`);
          md.isTrusted = true;
          return new vscode.Hover(md);
        }
        return undefined;
      }
    }
  );

  // Definition provider (go to file)
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    selector,
    {
      provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /c-[\w.\-]+/);
        if (!range) {
          return null;
        }
        const tag = document.getText(range);
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
          return null;
        }

        const compPath = tag.replace(/^c-/, '').replace(/[.\-]/g, path.sep);
        const full = path.join(root, COMPONENTS_DIR, compPath + '.view.php');
        if (fs.existsSync(full)) {
          return new vscode.Location(vscode.Uri.file(full), new vscode.Position(0, 0));
        }
        return null;
      }
    }
  );

  // Diagnostics
  const diagCollection = vscode.languages.createDiagnosticCollection('viewphp');
  context.subscriptions.push(diagCollection);

  // Run check on open/change/close
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(checkDoc),
    vscode.workspace.onDidChangeTextDocument(e => checkDoc(e.document)),
    vscode.workspace.onDidSaveTextDocument(checkDoc),
    vscode.workspace.onDidCloseTextDocument(doc => diagCollection.delete(doc.uri))
  );

  // Register providers & diagnostics
  context.subscriptions.push(snippetProvider, completionProvider, hoverProvider, definitionProvider, diagCollection);

  // Initial scan of open docs
  vscode.workspace.textDocuments.forEach(doc => {
    if (doc.languageId === 'php' && doc.fileName.endsWith('.view.php')) {
      checkDoc(doc);
    }
  });

  // Helper functions

  function buildCompletionItemsFromDir(dir: string, typedPrefix: string): vscode.CompletionItem[] {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const items: vscode.CompletionItem[] = [];

      for (const e of entries) {
        if (e.isDirectory()) {
          // directory -> suggest folder name
          const label = e.name;
          const it = new vscode.CompletionItem(label, vscode.CompletionItemKind.Folder);
          it.detail = 'component folder';
          items.push(it);
        } else if (e.isFile() && (e.name.endsWith('.view.php') || e.name.endsWith('.php'))) {
          const base = e.name.replace(/\.view\.php$|\.php$/i, '');
          const it = new vscode.CompletionItem(base, vscode.CompletionItemKind.File);
          it.detail = 'component file';
          // Insert only the remaining portion after last separator
          it.insertText = base;
          items.push(it);
        }
      }

      return items;
    } catch (err) {
      return [];
    }
  }

  /**
   * Check document for:
   *  - unmatched @endif
   *  - @elseif without @if
   *  - unclosed / mismatched <c-...> tags
   */
  function checkDoc(doc: vscode.TextDocument) {
    if (doc.languageId !== 'php' || !doc.fileName.endsWith('.view.php')) {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = doc.getText();
    const lines = text.split(/\r?\n/);

    // Stack for @if
    const ifStack: number[] = [];
    // Stack for component tags -> store {name, line, character}
    const compStack: Array<{ name: string; line: number; char: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // handle @if / @elseif / @endif
      if (/\@if\b/.test(line)) {
        ifStack.push(i);
      }
      if (/\@elseif\b/.test(line)) {
        if (ifStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length));
          diagnostics.push(new vscode.Diagnostic(range, '`@elseif` without matching `@if`', vscode.DiagnosticSeverity.Warning));
        }
      }
      if (/\@endif\b/.test(line)) {
        if (ifStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, line.length));
          diagnostics.push(new vscode.Diagnostic(range, '`@endif` without matching `@if`', vscode.DiagnosticSeverity.Warning));
        } else {
          ifStack.pop();
        }
      }

      // scan for opening <c-...> tags (may have attributes)
      const openRegex = /<c-([a-zA-Z0-9_.\-]+)(\s[^>]*)?>/g;
      let m: RegExpExecArray | null;
      while ((m = openRegex.exec(line)) !== null) {
        compStack.push({ name: m[1], line: i, char: m.index });
      }

      // scan for closing </c-...>
      const closeRegex = /<\/c-([a-zA-Z0-9_.\-]+)>/g;
      while ((m = closeRegex.exec(line)) !== null) {
        const closingName = m[1];
        // find last open with same name
        let foundIndex = -1;
        for (let s = compStack.length - 1; s >= 0; s--) {
          if (compStack[s].name === closingName) {
            foundIndex = s;
            break;
          }
        }
        if (foundIndex === -1) {
          // unmatched closing tag
          const range = new vscode.Range(new vscode.Position(i, m.index), new vscode.Position(i, m.index + m[0].length));
          diagnostics.push(new vscode.Diagnostic(range, `Unmatched closing component </c-${closingName}>`, vscode.DiagnosticSeverity.Warning));
        } else {
          // pop everything up to foundIndex (treat as closed)
          compStack.splice(foundIndex, 1);
        }
      }
    }

    // leftover ifStack entries -> unclosed if blocks
    if (ifStack.length > 0) {
      for (const lineNo of ifStack) {
        const lineText = lines[lineNo];
        const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, lineText.length));
        diagnostics.push(new vscode.Diagnostic(range, '`@if` without matching `@endif`', vscode.DiagnosticSeverity.Warning));
      }
    }

    // leftover component stack -> unclosed components
    for (const p of compStack) {
      const lineText = lines[p.line] || '';
      const range = new vscode.Range(new vscode.Position(p.line, p.char), new vscode.Position(p.line, Math.min(p.char + 30, lineText.length)));
      diagnostics.push(new vscode.Diagnostic(range, `Unclosed component <c-${p.name}>`, vscode.DiagnosticSeverity.Warning));
    }

    diagCollection.set(doc.uri, diagnostics);
  }
}

export function deactivate() {
  console.log('view-php extension deactivated');
}