import * as popover from "@zag-js/popover";
import {AiFillCaretDown} from "solid-icons/ai";
import {Accessor, ParentComponent, Show, splitProps} from "solid-js";
import {cx, htmlAttributes} from "../utils";
import {Button} from "./Button";
import {PopOver} from "./PopOver";
import {ChildrenOrFunc} from "./children_func";

interface Props extends htmlAttributes.button {
  readonly popOver: ChildrenOrFunc<[Accessor<popover.Api>]>;
}

export const SplitButton: ParentComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["popOver"]);
  return (
    <div class="flex items-stretch">
      <Button
        {...htmlAttributes.merge(buttonProps, {class: cx("flex-grow", props.popOver ? "!rounded-e-none" : undefined)})}
      >
        {buttonProps.children}
      </Button>
      <Show when={props.popOver}>
        {(popOver) => (
          <PopOver
            trigger={(triggerProps) => (
              <Button
                {...htmlAttributes.merge(buttonProps, {
                  class: "basis-0 -ml-px !rounded-s-none border-l border-l-memo-active",
                })}
                {...triggerProps()}
              >
                <AiFillCaretDown class="text-current" />
              </Button>
            )}
          >
            {popOver()}
          </PopOver>
        )}
      </Show>
    </div>
  );
};
