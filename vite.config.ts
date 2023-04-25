import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['./resources/js/app.ts'],
            refresh: true,
        }),
    ],
    server: {
        port: 9082,
        host: "0.0.0.0",
        strictPort: true,
    }
});
