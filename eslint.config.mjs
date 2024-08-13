import js from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import solid from "eslint-plugin-solid";
import typescript from "typescript-eslint";

export default [
  js.configs.recommended,
  solid.configs["flat/recommended"],
  ...typescript.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.js", "**/*.mjs"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", {allow: ["info", "warn", "error"]}],
      "no-constant-condition": "warn",
      "no-constant-binary-expression": "off",
      "no-debugger": "warn",
      "no-empty": "off",
      "no-inner-declarations": "off",
      "no-restricted-syntax": [
        "warn",
        // For creating the selectors, use https://astexplorer.net/ with JavaScript and @typescript-eslint/parser.
        {
          selector: "JSXOpeningElement > JSXIdentifier[name='button']",
          message: "Use <Button> instead.",
        },
        {
          // It's impossible to match slashes, so here \W is used instead.
          selector: "ImportDeclaration[source.value=/^\\.\\.\\W\\.\\.\\W/]",
          message: "Don't import from ../../, use the absolute path instead.",
        },
        {
          selector:
            "TSInterfaceDeclaration[id.name=/Props$/] > TSInterfaceBody > TSPropertySignature[readonly!='true']",
          message: "Mark props as readonly, this avoids some tricky bugs.",
        },
        {
          selector:
            "TSInterfaceDeclaration[id.name=/Props$/] > TSInterfaceBody > TSPropertySignature > TSTypeAnnotation > TSArrayType",
          message: "Mark array props as readonly arrays (`readonly Type[]`), this avoids some tricky bugs.",
        },
        {
          selector:
            "TSInterfaceDeclaration[id.name=/Props$/] > TSInterfaceBody > TSPropertySignature > TSTypeAnnotation > TSTypeReference[typeName.name=/^(Set|Map)$/]",
          message: "Mark Set/Map props as ReadonlySet/ReadonlyMap, this avoids some tricky bugs.",
        },
        {
          selector: "Identifier[name=/_onlyDEV$/], JSXIdentifier[name=/_onlyDEV$/]",
          message: "Do not submit usage of the *_onlyDEV helpers.",
        },
      ],
      "no-unused-expressions": "warn",
      "no-unused-vars": "off",
      "no-warning-comments": [
        "warn",
        {
          terms: ["DO NOT SUBMIT"],
          location: "anywhere",
        },
      ],
      "prefer-const": "warn",
      "sort-imports": "off",
      "sort-keys": "off",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
];
