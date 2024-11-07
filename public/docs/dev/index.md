# Developers help

![Memo logo](memo_logo.png "Memo logo")

This document presents some of the Markdown features that can be used in Memo documentation.

## Markdown syntax {#syntax}

- Standard [Markdown syntax](https://commonmark.org/help/) is supported.
- Headers:
  - The text of the `# Title` header is used as the page title.
  - Use `## Header title {#header-anchor}` to create an anchor for the section.
- Links:
  - For links inside the documentation, use `[text](relative_path)` (e.g. [this file](index)), `[text](relative-path#anchor)`, `[text](../relative-path)` (e.g. [markdown syntax](../dev/index#syntax)).
  - For links to the Memo app, use `[text](/absolute/memo/path)` (e.g. [the help](/help)).
    - For links to facility pages, use `[text](/__facility/path)` (e.g. [calendar](/__facility/calendar)).
  - For external links just use the full URL (e.g. [Memo on GitHub](https://github.com/mblajek/Memo/)).
- Images are supported using the standard syntax `![alt text](path "optional title")` (see the Memo logo above).
- Tables are supported (see [below](#files) for an example).
- Texts from the translations can be inserted by writing `$t(<translation_key>)` (without the `<>` brackets), or `$t(<translation_key>|cap)` to capitalise the text.
  Example: _$t(models.user._name|cap)_ is the word for _user_ in the language $t(language).
- The created markdown should pass the configured markdown linter (although the linter rules can be tweaked as needed).

## Files organisation {#files}

| Help types                                                                       | Markdown file URL                        | App URL                |
| -------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| Documentation for the Memo users                                                 | /docs/`language code`/index.md           | [/help](/help)         |
| Documentation for the Memo developers, mainly related to creating the help pages | [/docs/dev/index.md](/docs/dev/index.md) | [/help/dev](/help/dev) |

### Translations {#translations}

The user documentation for each supported language is placed in a separate directory under /docs. Keep in mind that file names and anchors should have English names so that the documentation structure is the same in every language.

### Include {#include}

$include(include.part.md)

## Index

- [Developer modes](developer-modes)
