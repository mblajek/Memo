import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import solidPlugin from "vite-plugin-solid";
import tsConfigPaths from "vite-tsconfig-paths";
import eslint from "vite-plugin-eslint";

export default defineConfig({
    resolve: {
        alias: [
            {
                find: /^~(.+)/,
                replacement: "$1",
            },
        ],
    },
    plugins: [
        laravel({
            input: ["./resources/js/index.tsx"],
            refresh: true,
        }),
        solidPlugin(),
        tsConfigPaths(),
        // eslint(),
    ],
    server: {
        port: 9082,
        host: "0.0.0.0",
        strictPort: true,
    },
    build: {
        target: "ESNext",
    },
});
