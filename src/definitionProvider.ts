import * as vscode from 'vscode';
import { COMPONENTS_DIR, selector } from './base/constants';
import path from 'path';
import * as fs from 'fs';

// Definition provider (go to file)
export const definitionProvider = vscode.languages.registerDefinitionProvider(
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