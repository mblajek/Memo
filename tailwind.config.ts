import type {Config} from "tailwindcss";

const APP_COLORS = {
  "memo-active": "rgb(from var(--tc-memo-active) r g b / <alpha-value>)",
  "popup-bg": "rgb(from var(--tc-popup-bg) r g b / <alpha-value>)",
  "hover": "rgb(from var(--tc-hover) r g b / <alpha-value>)",
  "select": "rgb(from var(--tc-select) r g b / <alpha-value>)",
  "disabled": "rgb(from var(--tc-disabled) r g b / <alpha-value>)",
  "input-border": "rgb(from var(--tc-input-border) r g b / <alpha-value>)",
  "grey-text": "rgb(from var(--tc-grey-text) r g b / <alpha-value>)",
};

const Z_INDEX = {
  modal: "1000",
  // Higher than modal, because a dropdown on the main page will normally close when opening a modal,
  // and dropdowns on modals need to be on top of it.
  // TODO: Consider doing this better.
  dropdown: "1100",
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
      minHeight: {
        "big-input": "2.5rem",
        "small-input": "1.8rem",
      },
      fontWeight: {
        "weight-medium": "500",
      },
      listStyleType: {
        // Reduce spacing between the disc and the text when using list-disc.
        disc: "'⦁ '",
      },
    },
    fontFamily: {
      roboto: "Roboto",
      mono: "Roboto Mono",
    },
  },
  darkMode: "class",
} satisfies Config;
