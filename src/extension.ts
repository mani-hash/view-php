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
          ifSnippet.detail = 'MiniBlade @if ... @endif';
          items.push(ifSnippet);

          const componentSnippet = new vscode.CompletionItem('c-', vscode.CompletionItemKind.Snippet);
          componentSnippet.insertText = new vscode.SnippetString('<c-${1:component} ${2:attr}="${3:value}">\n\t$0\n</c-${1:component}>');
          componentSnippet.detail = 'MiniBlade component tag';
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
}

export function deactivate() {
  console.log('view-php extension deactivated');
}