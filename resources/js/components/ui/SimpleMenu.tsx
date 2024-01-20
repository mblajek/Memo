import {For, JSX, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {Button} from "./Button";

interface Props extends htmlAttributes.div {
  readonly items: readonly MenuItem[];
}

export interface MenuItem {
  readonly label: JSX.Element;
  readonly onClick: htmlAttributes.button["onClick"];
}

export const SimpleMenu: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["items"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex flex-col items-stretch"})}>
      <For each={props.items}>
        {(item) => (
          <Button class="px-2 py-1 text-left hover:bg-hover" onClick={item.onClick}>
            {item.label}
          </Button>
        )}
      </For>
    </div>
  );
};
