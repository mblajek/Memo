import {A, AnchorProps} from "@solidjs/router";
import {IconTypes} from "solid-icons";
import {Component, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";

export interface NavigationItemProps extends AnchorProps {
  icon: IconTypes;
}

export const NavigationItem: Component<NavigationItemProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "icon"]);
  return (
    <A
      {...rest}
      class="mb-2 py-2 px-4 rounded-lg flex flex-row items-center gap-3 hover:bg-white"
      activeClass="bg-white"
    >
      <Dynamic component={local.icon} size="25" />
      <span>{local.children}</span>
    </A>
  );
};
