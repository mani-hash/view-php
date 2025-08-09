import path from 'path';
import * as vscode from 'vscode';

const COMPONENTS_DIR = path.join('resources', 'views', 'components');

/**
 * Document selector: strictly for PHP files with .view.php extension.
 */
const selector: vscode.DocumentSelector = [
  { language: 'php', scheme: 'file', pattern: '**/*.view.php' }
];

export {
    COMPONENTS_DIR,
    selector
};