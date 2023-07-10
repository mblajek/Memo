import type { StorybookConfig } from "storybook-solidjs-vite";
const config: StorybookConfig = {
  stories: [
    "../resources/js/**/*.mdx",
    "../resources/js/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "storybook-solidjs-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};
export default config;
