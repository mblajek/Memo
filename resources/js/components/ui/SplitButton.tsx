import * as popover from "@zag-js/popover";
import {Accessor, ParentComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {Button} from "./Button";
import {PopOver} from "./PopOver";
import {ChildrenOrFunc} from "./children_func";
import {AiFillCaretDown} from "solid-icons/ai";

interface Props extends htmlAttributes.button {
  readonly popOver: ChildrenOrFunc<[Accessor<popover.Api>]>;
}

export const SplitButton: ParentComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["popOver"]);
  return (
    <div class="flex items-stretch">
      <Button {...htmlAttributes.merge(buttonProps, {class: "!rounded-e-none"})}>{buttonProps.children}</Button>
      <PopOver
        trigger={(triggerProps) => (
          <Button
            {...htmlAttributes.merge(buttonProps, {
              class: "-ml-px !px-0.5 !rounded-s-none border-l border-l-memo-active",
            })}
            {...triggerProps()}
          >
            <AiFillCaretDown class="text-current" />
          </Button>
        )}
      >
        {props.popOver}
      </PopOver>
    </div>
  );
};
