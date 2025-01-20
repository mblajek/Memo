import {Title} from "@solidjs/meta";
import {EM_DASH} from "components/ui/symbols";
import {useLangFunc} from "components/utils/lang";
import {translationsLoaded} from "i18n_loader";
import {
  Accessor,
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  ParentComponent,
  useContext,
  VoidComponent,
} from "solid-js";

const AppTitleContext = createContext<AppTitleContextValue>();

interface AppTitleContextValue {
  registerPrefix(prefix: TitlePart): void;
}

type TitlePart = Accessor<string | undefined>;

export const AppTitleProvider: ParentComponent = (props) => {
  const t = useLangFunc();
  const baseAppName: TitlePart = () => (translationsLoaded() ? t("app_name") : "Memo");
  const [parts, setParts] = createSignal<readonly TitlePart[]>([baseAppName]);
  const appTitle = createMemo(() => {
    return parts()
      .map((p) => p()?.trim())
      .filter(Boolean)
      .join(` ${EM_DASH} `);
  });
  function registerPrefix(prefix: TitlePart) {
    setParts((parts) => [prefix, ...parts]);
    onCleanup(() => setParts((parts) => parts.filter((p) => p !== prefix)));
  }
  return (
    <AppTitleContext.Provider value={{registerPrefix}}>
      <Title>{appTitle()}</Title>
      {props.children}
    </AppTitleContext.Provider>
  );
};

interface AppTitlePrefixProps {
  readonly prefix: string | undefined;
}

export const AppTitlePrefix: VoidComponent<AppTitlePrefixProps> = (props) => {
  const context = useContext(AppTitleContext);
  if (!context) {
    throw new Error("Not in AppTitleProvider");
  }
  // eslint-disable-next-line solid/reactivity
  context.registerPrefix(() => props.prefix);
  return <></>;
};
