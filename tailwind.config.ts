import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./resources/js/**/*.{js,ts,jsx,tsx}",
    "./resources/views/**/*.blade.php",
  ],
  plugins: [],
  theme: {
    fontFamily: {
      roboto: "Roboto",
    },
  },
};

export default config;
