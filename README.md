# view-php README

View PHP is a minimal vscode extension that enables code snippets, suggestions, code highlighting and error messages for an in-house blade style templating engine inspired from laravel blade. 

This extension is intended for internal use among CS 28 group of Year 2 at **UCSC** for 2nd year group project. You are free to use this extension if you already have your own version of blade like templating engine that may benefit from this extension. I recommend forking and making your own modifications since development of this extension was a side thought for our group project.

NOTE: This is not intended for any serious or robust project. This is intended only for educational purposes or university projects.

## Features

- Snippets for the following preprocessor directives
    - @if/@else/@elseif/@endif
    - @foreach/@endforeach
    - @section/@endsection
    - @extends
    - @yield
- View php component auto suggestion
- Code highlighting
- Errors and warning highlighting

## Requirements

This extension will work on any file named view.php but inorder to actually make use of it you are expected to have your own minimal version of blade like templating engine which suppports the following preprocessor directives:

- @if/@else/@elseif/@endif
- @foreach/@endforeach
- @section/@endsection
- @extends
- @yield
- `{{ }}` interpolation
- blade like components that support single slots/child component (note should be prefixed with c not x. Example: `<c-button>click</c-button>`)

## Known Issues

List of known issues with this extension that may be improved upon later.

- Snippets are not perfect and will not replace the `@` infront of the preprocessor directive when you choose to auto complete from vscode suggestion window.
- Error checking is not perfect nor efficient, unexpected bugs can occur (further testing is needed)
- The auto suggestion for component tags does not accurately list files or folders in the correct order. Right now it is just used as a visual aid to get the correct component / folder name and the developer is expected to know the folder path of the nested component.

## Release Notes

### Unreleased
**Highlights**
- Injection grammar now augments the built-in HTML+PHP grammar (no replacement), preserving PHP/HTML/JS/CSS intellisense while adding mini-Blade tokens like `@if`, `@foreach`, `{{ }}`, and `<c-...>`.
- Component support improved:
  - `<c-name ... />` self-closing components supported.
  - Component completion that suggests files and folders under `resources/views/components`.
  - Hover and Go-to-Definition open the component view directly.
- Diagnostics added for unmatched `@if/@endif` and unclosed `<c-*>` tags.
- Programmatic snippet provider added so snippets appear only for `*.view.php` files.

---

### 1.0.0 — Initial release (2025-08-09)
**What’s included**
- Basic support for mini-Blade styled templates in `.view.php` files:
  - `{{ }}` interpolation with PHP tokenization,
  - `@if / @elseif / @else / @endif`,
  - `@foreach / @endforeach`,
  - `@section / @endsection`, `@yield`, `@extends`, `@include`.
- Component tags `<c-foo>...</c-foo>` and `<c-foo />` (self-closing).
- Editor features:
  - Syntax highlighting (injection into HTML+PHP),
  - Completions for component paths,
  - Hover information for components,
  - Go-to-definition for component file,
  - Diagnostics for common template errors.
- Developer experience:
  - `.vscode/launch.json` and `.vscode/tasks.json` for local development with `esbuild`.
  - `vsce` packaging/publishing instructions included in repo.

**Installation**
- From Marketplace (coming soon): search `view-php` (publisher: `manimehalan`).
- Or install locally:
  ```bash
  vsce package
  code --install-extension view-php-1.0.0.vsix


