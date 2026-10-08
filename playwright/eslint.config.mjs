import root from "../eslint.config.mjs";

export default [
  {
    ignores: [
      "playwright/eslint.config.mjs",
      "playwright/playwright-report/**",
      "playwright/test-results/**",
      "playwright/.state/**",
    ],
  },
  ...root,
  {
    files: ["**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
