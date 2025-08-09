import * as vscode from 'vscode';
import { COMPONENTS_DIR, selector } from './base/constants';
import path from 'path';
import * as fs from 'fs';

// Hover provider for <c-...>
export const hoverProvider = vscode.languages.registerHoverProvider(
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