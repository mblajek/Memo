import {A, AnchorProps} from "@solidjs/router";
import {useQueryClient} from "@tanstack/solid-query";
import {Capitalize} from "components/ui/Capitalize";
import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {IconTypes} from "solid-icons";
import {Show, VoidComponent, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";

export interface NavigationItemProps extends Omit<AnchorProps, "children"> {
  readonly icon: IconTypes;
  /**
   * A translations sub-key in routes defining the page title.
   * Used directly as the page title if key is missing - only to be used for dev pages.
   */
  readonly routeKey: string;
}

/** Marker class to detect navigation item activity. */
const ACTIVE_ITEM_CLASS = "__activeNavItem";

export const NavigationItem: VoidComponent<NavigationItemProps> = (allProps) => {
  const [props, aProps] = splitProps(allProps, ["icon", "routeKey"]);
  const t = useLangFunc();
  const queryClient = useQueryClient();
  return (
    <A
      {...htmlAttributes.merge(aProps, {
        class:
          "py-2 px-3 rounded-lg flex flex-row items-center gap-3 no-underline text-black whitespace-nowrap hover:bg-white",
      })}
      activeClass={cx("bg-white", ACTIVE_ITEM_CLASS)}
      onClick={(event) => {
        if (event.currentTarget.classList.contains(ACTIVE_ITEM_CLASS)) {
          queryClient.invalidateQueries();
        }
      }}
    >
      <Dynamic component={props.icon} size="25" />
      <Show when={t(`routes.${props.routeKey}`, {defaultValue: ""})} fallback={props.routeKey}>
        {(text) => <Capitalize text={text()} />}
      </Show>
    </A>
  );
};
