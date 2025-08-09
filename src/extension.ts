import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { stripCommentsPreservePositions } from './helpers/stripCommentsPreservePositions';

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

          function makeSnippet(label: string, body: string, detail: string): vscode.CompletionItem {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
            item.insertText = new vscode.SnippetString(body);
            item.detail = detail;
            item.range = document.getWordRangeAtPosition(position, new RegExp(`@?${label}`));
            return item;
          }

          items.push(
            makeSnippet('if', '@if (${1:condition})\n\t$0\n@endif', 'ViewPHP @if ... @endif'),
            makeSnippet('foreach', '@foreach (${1:condition})\n\t$0\n@endforeach', 'ViewPHP @foreach ... @endforeach'),
            makeSnippet('section', '@section(\'${1:value}\')\n\t$0\n@endsection', 'ViewPHP @section ... @endsection'),
            makeSnippet('yield', '@yield(\'${1:value}\')', 'ViewPHP @yield'),
            makeSnippet('include', '@include(\'${1:value}\')', 'ViewPHP @include'),
            makeSnippet('extends', '@extends(\'${1:value}\')', 'ViewPHP @extends'),
            makeSnippet(
              'c-',
              '<c-${1:component} ${2:attr}="${3:value}">\n\t$0\n</c-${1:component}>',
              'ViewPHP component tag'
            ),
            makeSnippet('{{', '{{ ${1:expr} }}', 'Interpolation')
          );

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

    const cleaned = stripCommentsPreservePositions(text);
    const lines = cleaned.split(/\r?\n/);
    const originalLines = text.split(/\r?\n/);

    // Stacks
    const ifStack: number[] = [];
    const forStack: number[] = [];
    const sectionStack: number[] = [];
    const compStack: Array<{ name: string; line: number; char: number }> = [];
    let extendCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // @extends
      if (/\@extends\b/.test(line)) {
        extendCount += 1;
        if (extendCount > 1) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, originalLines[i].length));
          diagnostics.push(new vscode.Diagnostic(range, 'Only one @extends is allowed per file', vscode.DiagnosticSeverity.Error));
        }
      }

      // @@ sequence — still flag if necessary (adjust message if you want)
      if (/\@\@+/.test(line)) {
        const match = line.match(/\@\@+/);
        if (match) {
          const start = match.index ?? 0;
          const range = new vscode.Range(new vscode.Position(i, start), new vscode.Position(i, start + match[0].length));
          diagnostics.push(new vscode.Diagnostic(range, 'Incorrect syntax (unexpected @@)', vscode.DiagnosticSeverity.Error));
        }
      }

      // @if / @elseif / @endif
      if (/\@if\b/.test(line)) {
        ifStack.push(i);
      }
      if (/\@elseif\b/.test(line)) {
        if (ifStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, originalLines[i].length));
          diagnostics.push(new vscode.Diagnostic(range, '@elseif without matching @if', vscode.DiagnosticSeverity.Error));
        }
      }
      if (/\@endif\b/.test(line)) {
        if (ifStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, originalLines[i].length));
          diagnostics.push(new vscode.Diagnostic(range, '@endif without matching @if', vscode.DiagnosticSeverity.Error));
        } else {
          ifStack.pop();
        }
      }

      // @foreach / @endforeach
      if (/\@foreach\b/.test(line)) {
        forStack.push(i);
      }
      if (/\@endforeach\b/.test(line)) {
        if (forStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, originalLines[i].length));
          diagnostics.push(new vscode.Diagnostic(range, '@endforeach without matching @foreach', vscode.DiagnosticSeverity.Error));
        } else {
          forStack.pop();
        }
      }

      // @section / @endsection
      if (/\@section\b/.test(line)) {
        sectionStack.push(i);
      }
      if (/\@endsection\b/.test(line)) {
        if (sectionStack.length === 0) {
          const range = new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, originalLines[i].length));
          diagnostics.push(new vscode.Diagnostic(range, '@endsection without matching @section', vscode.DiagnosticSeverity.Error));
        } else {
          sectionStack.pop();
        }
      }

      // Component tags:
      // opening tag (handles attributes) and optional self-closing
      const openRegex = /<c-([a-zA-Z0-9_.\-]+)(\s[^>]*?)?(\/\s*)?>/g;
      let m: RegExpExecArray | null;
      while ((m = openRegex.exec(line)) !== null) {
        const full = m[0];
        const name = m[1];
        // if self-closing (ends with '/>' possibly with spaces) then ignore pushing
        if (/[\/]\s*>$/.test(full)) {
          // self-closed, nothing to do
        } else {
          compStack.push({ name, line: i, char: m.index });
        }
      }

      // closing tags
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
          const range = new vscode.Range(new vscode.Position(i, m.index), new vscode.Position(i, m.index + m[0].length));
          diagnostics.push(new vscode.Diagnostic(range, `Unmatched closing component </c-${closingName}>`, vscode.DiagnosticSeverity.Warning));
        } else {
          // pop the found open (assume proper nesting)
          compStack.splice(foundIndex, 1);
        }
      }
    }

    // leftover opens
    if (ifStack.length > 0) {
      for (const lineNo of ifStack) {
        const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, originalLines[lineNo].length));
        diagnostics.push(new vscode.Diagnostic(range, '@if without matching @endif', vscode.DiagnosticSeverity.Warning));
      }
    }

    if (forStack.length > 0) {
      for (const lineNo of forStack) {
        const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, originalLines[lineNo].length));
        diagnostics.push(new vscode.Diagnostic(range, '@foreach without matching @endforeach', vscode.DiagnosticSeverity.Warning));
      }
    }

    if (sectionStack.length > 0) {
      for (const lineNo of sectionStack) {
        const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, originalLines[lineNo].length));
        diagnostics.push(new vscode.Diagnostic(range, '@section without matching @endsection', vscode.DiagnosticSeverity.Warning));
      }
    }

    for (const p of compStack) {
      const lineText = originalLines[p.line] || '';
      const startChar = p.char;
      const endChar = Math.min(startChar + 30, lineText.length);
      const range = new vscode.Range(new vscode.Position(p.line, startChar), new vscode.Position(p.line, endChar));
      diagnostics.push(new vscode.Diagnostic(range, `Unclosed component <c-${p.name}>`, vscode.DiagnosticSeverity.Warning));
    }

    diagCollection.set(doc.uri, diagnostics);
  }
}

export function deactivate() {
  console.log('view-php extension deactivated');
}