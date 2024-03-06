import {createLocalStoragePersistence} from "components/persistence/persistence";
import {richJSONSerialiser} from "components/persistence/serialiser";
import {createCached} from "components/utils/cache";
import {IconProps, IconTypes} from "solid-icons";
import {IoMoonOutline, IoSunnyOutline} from "solid-icons/io";
import {ParentComponent, VoidComponent, createEffect, createSignal, onCleanup} from "solid-js";
import {Dynamic} from "solid-js/web";

export type Theme = "light" | "dark";

type PersistentState = {
  readonly theme: Theme;
};

const ICONS: Readonly<Record<Theme, IconTypes>> = {
  light: IoSunnyOutline,
  dark: IoMoonOutline,
};

export const ThemeIcon: VoidComponent<IconProps> = (props) => {
  const {theme} = useThemeControl();
  return <Dynamic component={ICONS[theme()]} {...props} />;
};

/** This component applies the theme to the whole page (not just to its children). It must not be nested. */
export const PageWithTheme: ParentComponent = (props) => {
  const {theme} = useThemeControl();
  createEffect(() => {
    document.documentElement.classList.toggle("dark", theme() === "dark");
  });
  onCleanup(() => {
    document.documentElement.classList.remove("dark");
  });
  return <>{props.children}</>;
};

export const useThemeControl = createCached(() => {
  const [theme, setTheme] = createSignal<Theme>("light");
  createLocalStoragePersistence<PersistentState>({
    key: "theme",
    value: () => ({
      theme: theme(),
    }),
    onLoad: (value) => {
      setTheme(value.theme);
    },
    serialiser: richJSONSerialiser<PersistentState>(),
    version: [1],
  });
  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  };
});
