import {A, AnchorProps} from "@solidjs/router";
import {useQueryClient} from "@tanstack/solid-query";
import {cx, htmlAttributes} from "components/utils";
import {IconTypes} from "solid-icons";
import {ParentComponent, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";

export interface NavigationItemProps extends AnchorProps {
  icon: IconTypes;
}

/** Marker class to detect navigation item activity. */
const ACTIVE_ITEM_CLASS = "__activeNavItem";

export const NavigationItem: ParentComponent<NavigationItemProps> = (allProps) => {
  const [props, aProps] = splitProps(allProps, ["children", "icon"]);
  const queryClient = useQueryClient();
  return (
    <A
      {...htmlAttributes.merge(aProps, {
        class: "mb-2 py-2 px-4 rounded-lg flex flex-row items-center gap-3 no-underline text-black hover:bg-white",
      })}
      activeClass={cx("bg-white", ACTIVE_ITEM_CLASS)}
      onClick={(event) => {
        if (event.currentTarget.classList.contains(ACTIVE_ITEM_CLASS)) {
          queryClient.invalidateQueries();
        }
      }}
    >
      <Dynamic component={props.icon} size="25" />
      <span>{props.children}</span>
    </A>
  );
};
