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