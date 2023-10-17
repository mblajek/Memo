import type {Config} from "tailwindcss";

const APP_COLORS = {
  //  A bright blue color used for various active elements on page.
  "memo-active": "#06b6d4",
  // A pale blue-grey color for highlighting hovered areas of active elements by setting their background color.
  // Not necessarily good for hovered buttons etc.
  "hover": "#e6f0f7",
  // A light blue color for currently selected areas of active elements.
  "select": "#b7e8f6",
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
