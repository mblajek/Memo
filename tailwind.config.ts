import type {Config} from "tailwindcss";

const APP_COLORS = {
  "memo-active": "#06b6d4",
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
    },
    fontFamily: {
      roboto: "Roboto",
    },
  },
} satisfies Config;
