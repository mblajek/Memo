import {A, AnchorProps, useLocation} from "@solidjs/router";
import {clearAllHistoryState} from "components/persistence/history_persistence";
import {Capitalize} from "components/ui/Capitalize";
import {HideableSection} from "components/ui/HideableSection";
import {cx, delayedAccessor, htmlAttributes, useLangFunc} from "components/utils";
import {IconTypes} from "solid-icons";
import {FaSolidAngleDown} from "solid-icons/fa";
import {ParentComponent, Show, children, createMemo, createSignal, on, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";

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
    on(delayedAccessor(activeItemTrigger, {timeMs: 20}), () => container()?.querySelector(`a.${ACTIVE_ITEM_CLASS}`)),
  );
  const ch = children(() => props.children);
  return (
    <div ref={setContainer} class="flex flex-col">
      <A
        role="button"
        {...htmlAttributes.merge(aProps, {
          class: cx(
            props.small ? "gap-2" : "gap-3 min-h-10",
            "px-3 py-1 rounded-lg flex flex-row items-center text-black hover:bg-white",
          ),
          style: {"line-height": "1.3"},
        })}
        activeClass={cx("bg-white", ACTIVE_ITEM_CLASS)}
        onClick={(event) => {
          if (event.currentTarget.classList.contains(ACTIVE_ITEM_CLASS) && location.pathname === aProps.href) {
            clearAllHistoryState({forceReset: true});
            event.preventDefault();
          }
        }}
      >
        <Dynamic component={props.icon} size={props.small ? 18 : 25} />
        <span>
          <Show when={t(`routes.${props.routeKey}`, {defaultValue: ""})} fallback={props.routeKey}>
            {(text) => <Capitalize text={text()} />}
          </Show>
          <Show when={ch()}>
            {" "}
            <FaSolidAngleDown size="12" class="inlineIcon !mb-0 text-gray-400" />
          </Show>
        </span>
      </A>
      <Show when={ch()}>
        {(children) => (
          <HideableSection show={hasActiveItem()}>
            <div class="mt-1 ml-3 flex flex-col gap-1">{children()}</div>
          </HideableSection>
        )}
      </Show>
    </div>
  );
};
