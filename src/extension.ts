import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { stripCommentsPreservePositions } from './helpers/stripCommentsPreservePositions';
import { buildCompletionItemsFromDir } from './helpers/buildCompletionItemsFromDir';
import { COMPONENTS_DIR, selector } from './base/constants';
import { snippetProvider } from './snippetProvider';
import { completionProvider } from './completionProvider';
import { hoverProvider } from './hoverProvider';
import { definitionProvider } from './definitionProvider';
import { checkDoc, diagCollection } from './checkDoc';

export function activate(context: vscode.ExtensionContext) {
  console.log('view-php extension activated');

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
}

export function deactivate() {
  console.log('view-php extension deactivated');
}