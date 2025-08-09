# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Component completions and go-to-definition for `<c-...>` tags in `*.view.php` files.
- Injection grammar to augment built-in HTML+PHP highlighting (does **not** replace PHP/HTML intellisense).
- Diagnostics for unmatched `@if/@endif` and unclosed `<c-*>` tags.
- Programmatic snippet support (only in `*.view.php` via extension providers).
- Self-closing component support `<c-name ... />`.
- VS Code extension features: hover, definition, completion and diagnostics for components.
- Extension development `launch.json` + `tasks.json` for auto-building with `esbuild`.

### Fixed
- Defensive attribute parsing for self-closing components to avoid "offset on string" errors.
- Various grammar and provider selector issues so PHP/HTML LSPs continue to work.

### Changed
- Switched from registering a custom `viewphp` language to an injection grammar that injects into `text.html.php` to preserve core language features.

---

## [1.0.0] - 2025-08-09

### Added
- Initial public release of the `view-php` VS Code extension.
- Basic TextMate injection grammar for Blade-like directives (`@if`, `@foreach`, `{{ }}`, `<c-...>`).
- Component discovery: completion suggestions for components stored under `resources/views/components`.
- Hover provider showing component path and quick Open Definition.
- Diagnostic checks for common template mistakes.
- Simple snippets and sample `syntaxes/` + `snippets/` shipped.

### Documentation
- Included full README with installation instructions and recommended workspace settings.
- Added `.vscode/launch.json` for extension development and `tasks.json` for `esbuild` watch.

---

*(Use the "Unreleased" section for work in progress; bump versions above when publishing.)*
