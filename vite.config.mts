import laravel from "laravel-vite-plugin";
import eslint from "vite-plugin-eslint";
import solidPlugin from "vite-plugin-solid";
import solidSvg from "vite-plugin-solid-svg";
import tsConfigPaths from "vite-tsconfig-paths";
import {defineConfig} from "vitest/config";

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
        omitNestedClosingTags: true,
        // Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
        delegateEvents: false,
      },
    }),
    tsConfigPaths(),
    eslint(),
    solidSvg({defaultAsComponent: true}),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // See: https://sass-lang.com/documentation/breaking-changes/legacy-js-api/
        api: "modern-compiler",
      },
    },
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
