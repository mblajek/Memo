import type {Config} from "tailwindcss";

const APP_COLORS = {
  "memo-active": "#06b6d4",
};

const Z_INDEX = {
  modal: "1000",
  fullScreenLoader: "2000",
};

export default {
  content: ["./resources/js/**/*.{js,ts,jsx,tsx}", "./resources/views/**/*.blade.php"],
  plugins: [],
  theme: {
    extend: {
      aria: {
        invalid: "invalid",
      },
      colors: APP_COLORS,
      zIndex: Z_INDEX,
    },
    fontFamily: {
      roboto: "Roboto",
    },
  },
} satisfies Config;
