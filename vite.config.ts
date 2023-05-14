import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";
import eslint from "vite-plugin-eslint";
import solidPlugin from "vite-plugin-solid";
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
        solidPlugin(),
        tsConfigPaths(),
        eslint(),
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
});
