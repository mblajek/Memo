import laravel from "laravel-vite-plugin";
import {PluginOption} from "vite";
import eslint from "vite-plugin-eslint";
import solidPlugin from "vite-plugin-solid";
import solidSvg from "vite-plugin-solid-svg";
import tsConfigPaths from "vite-tsconfig-paths";
import {defineConfig} from "vitest/config";

function betterHotReload(): PluginOption {
  const LANG_FILE_PATTERN = /\/resources\/lang\/.+\.yml$/;
  const DOCS_FILE_PATTERN = /\/public\/docs\//;
  return {
    name: "better-hot-reload",
    handleHotUpdate({file, server}) {
      if (file.match(LANG_FILE_PATTERN)) {
        server.ws.send({type: "custom", event: "translationsFileChange"});
        return [];
      } else if (file.match(DOCS_FILE_PATTERN)) {
        server.ws.send({type: "custom", event: "docsFileChange"});
        return [];
      }
    },
  };
}

export default defineConfig({
  build: {
    target: "ESNext",
  },
  plugins: [
    laravel({
      input: ["./resources/js/index.tsx"],
      refresh: ["./resources/js"],
    }),
    solidPlugin({
      solid: {
        omitNestedClosingTags: true,
        // Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
        delegateEvents: false,
      },
    }),
    tsConfigPaths(),
    eslint({include: ["resources/js"]}),
    solidSvg({defaultAsComponent: true}),
    betterHotReload(),
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
