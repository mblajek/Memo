import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./resources/js/**/*.{js,ts,jsx,tsx}",
        "./resources/views/**/*.blade.php",
    ],
    plugins: [],
    theme: {
        extend: {},
    },
};

export default config;
