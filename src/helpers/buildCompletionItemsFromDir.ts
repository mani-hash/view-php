import * as vscode from 'vscode';
import * as fs from 'fs';

export function buildCompletionItemsFromDir(dir: string, typedPrefix: string): vscode.CompletionItem[] {
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