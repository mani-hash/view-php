import * as vscode from 'vscode';
import { COMPONENTS_DIR, selector } from './base/constants';
import path from 'path';
import * as fs from 'fs';
import { buildCompletionItemsFromDir } from './helpers/buildCompletionItemsFromDir';

// Completion Provider for <c-* tags (dot and hyphen based namespaces)
export const completionProvider = vscode.languages.registerCompletionItemProvider(
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