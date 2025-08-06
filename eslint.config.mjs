import js from "@eslint/js";
import typescriptParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import solid from "eslint-plugin-solid";
import {defineConfig} from "eslint/config";
import typescript from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  solid.configs["flat/recommended"],
  typescript.configs.recommendedTypeChecked,
  prettierConfig,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.js", "**/*.mjs"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {projectService: true},
    },
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-deprecated": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
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
      "solid/jsx-no-undef": "off",
      "solid/no-unknown-namespaces": [
        "error",
        // Add the bool: prefix, not included by the rule yet.
        {allowedNamespaces: ["on", "use", "prop", "attr", "bool"]},
      ],
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
]);
