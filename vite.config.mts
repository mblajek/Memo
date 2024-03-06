import laravel from "laravel-vite-plugin";
import {defineConfig} from "vitest/config";
import eslint from "vite-plugin-eslint";
import solidPlugin from "vite-plugin-solid";
import solidSvg from "vite-plugin-solid-svg";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    target: "ESNext",
  },
  plugins: [
    laravel({
      input: ["./resources/js/index.tsx"],
      refresh: true,
    }),
    solidPlugin({
      solid: {
        // Repeating the default, needed because this field is not optional for some reason.
        omitNestedClosingTags: false,
        // Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
        delegateEvents: false,
      },
    }),
    tsConfigPaths(),
    eslint(),
    solidSvg({defaultAsComponent: true}),
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: "$1",
      },
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 9082,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
  },
});
