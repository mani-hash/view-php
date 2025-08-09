import * as vscode from 'vscode';
import { selector } from './base/constants';

export const snippetProvider = vscode.languages.registerCompletionItemProvider(
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