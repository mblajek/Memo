import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./resources/js/**/*.{js,ts,jsx,tsx}",
    "./resources/views/**/*.blade.php",
  ],
  plugins: [],
  theme: {
    extend: {
      aria: {
        invalid: "invalid",
      },
    },
    fontFamily: {
      roboto: "Roboto",
    },
  },
};

export default config;
