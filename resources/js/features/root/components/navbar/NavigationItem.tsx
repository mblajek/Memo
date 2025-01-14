import {A, AnchorProps, useLocation} from "@solidjs/router";
import {clearAllHistoryState} from "components/persistence/history_persistence";
import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {HideableSection} from "components/ui/HideableSection";
import {title} from "components/ui/title";
import {cx, delayedAccessor, htmlAttributes, useLangFunc} from "components/utils";
import {useNavbarContext} from "features/root/layout/Navbar";
import {IconTypes} from "solid-icons";
import {FaSolidAngleDown} from "solid-icons/fa";
import {
  Match,
  ParentComponent,
  Show,
  Switch,
  VoidComponent,
  children,
  createMemo,
  createSignal,
  on,
  splitProps,
} from "solid-js";
import {Dynamic} from "solid-js/web";

type _Directives = typeof title;

export interface NavigationItemProps extends Omit<AnchorProps, "children"> {
  readonly icon: IconTypes;
  /**
   * A translations sub-key in routes defining the page title.
   * Used directly as the page title if key is missing - only to be used for dev pages.
   */
  readonly routeKey: string;
  /** Display the navigation item smaller, typically a submenu item. */
  readonly small?: boolean;
}

/** Marker class to detect navigation item activity. */
const ACTIVE_ITEM_CLASS = "__activeNavItem";

/** Navigation item in the left menu. Submenu can be specified as children. */
export const NavigationItem: ParentComponent<NavigationItemProps> = (allProps) => {
  const [props, aProps] = splitProps(allProps, ["icon", "routeKey", "small", "children"]);
  const t = useLangFunc();
  const location = useLocation();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const {
    collapsed: [collapsed],
  } = useNavbarContext();
  const [forceExpand, setForceExpand] = createSignal(false);
  /* A signal that changes whenever the active navigation item might change. */
  const activeItemTrigger = () => container() && location.pathname;
  /**
   * Whether this item or any of its children is active.
   *
   * This value is calculated by examining the applied active class. There doesn't seem to be any simpler and
   * fully correct way of doing this, the link component doesn't expose this value.
   *
   * The value is recalculated when activeItemTrigger changes, with a delay so that the active classes have time
   * to settle.
   */
  const hasActiveItem = createMemo(
    // eslint-disable-next-line solid/reactivity
    on(delayedAccessor(activeItemTrigger, {timeMs: 20}), () => {
      // Side effect: cancel force expanded on any navigation.
      setForceExpand(false);
      return container()?.querySelector(`a.${ACTIVE_ITEM_CLASS}`);
    }),
  );
  const RouteLabel: VoidComponent = () => (
    <Show when={t(`routes.${props.routeKey}`, {defaultValue: ""})} fallback={props.routeKey}>
      {(text) => <Capitalize text={text()} />}
    </Show>
  );
  const ExpandButton: VoidComponent = () => (
    <Button
      onClick={(e) => {
        setForceExpand(!forceExpand());
        e.preventDefault();
      }}
    >
      <FaSolidAngleDown
        size="12"
        class={cx("text-black text-opacity-40", hasActiveItem() ? "text-opacity-60" : "hover:text-opacity-60")}
      />
    </Button>
  );
  const ch = children(() => props.children);
  return (
    <div ref={setContainer} class={cx(collapsed() ? "self-center" : undefined, "flex flex-col")}>
      <div use:title={collapsed() ? [<RouteLabel />, {placement: "right", offset: [0, 4], delay: 100}] : undefined}>
        <A
          role="button"
          {...htmlAttributes.merge(aProps, {
            class: cx(
              collapsed() ? "px-4 py-2" : ["px-2 py-1", props.small ? "gap-2" : "gap-3 min-h-10"],
              "self-center rounded-lg flex flex-row items-center text-black hover:bg-white hover:bg-opacity-50",
            ),
            style: {"line-height": "1.3"},
          })}
          activeClass={cx("bg-white !bg-opacity-100", ACTIVE_ITEM_CLASS)}
          onClick={(event) => {
            if (event.currentTarget.classList.contains(ACTIVE_ITEM_CLASS) && location.pathname === aProps.href) {
              clearAllHistoryState({forceReset: true});
              event.preventDefault();
            }
          }}
        >
          <div class="self-center">
            <Dynamic component={props.icon} size={props.small ? 18 : 25} />
          </div>
          <Switch>
            <Match when={!collapsed()}>
              {" "}
              <div class="flex items-center gap-1">
                <RouteLabel />
                <Show when={ch()}>
                  <ExpandButton />
                </Show>
              </div>
            </Match>
            <Match when={ch()}>
              <div class="w-0 relative left-0.5">
                <ExpandButton />
              </div>
            </Match>
          </Switch>
        </A>
      </div>
      <Show when={ch()}>
        {(children) => (
          <HideableSection show={hasActiveItem() || forceExpand()}>
            <div class={cx(collapsed() ? "ml-1.5" : "mt-1 ml-3 gap-1", "flex flex-col")}>{children()}</div>
          </HideableSection>
        )}
      </Show>
    </div>
  );
};
