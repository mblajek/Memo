import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {AiFillCaretDown} from "solid-icons/ai";
import {ParentComponent, Show, splitProps} from "solid-js";
import {Button} from "./Button";
import {PopOver, PopOverControl} from "./PopOver";
import {ChildrenOrFunc} from "./children_func";

interface Props extends htmlAttributes.button {
  readonly divClass?: string;
  readonly popOver: ChildrenOrFunc<[PopOverControl]>;
}

export const SplitButton: ParentComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["divClass", "popOver"]);
  return (
    <div class={cx(props.divClass, "flex items-stretch")}>
      <Button
        {...htmlAttributes.merge(buttonProps, {class: cx("flex-grow", props.popOver ? "!rounded-e-none" : undefined)})}
      >
        {buttonProps.children}
      </Button>
      <Show when={props.popOver}>
        {(popOverContents) => (
          <PopOver
            trigger={(popOver) => (
              <Button
                {...htmlAttributes.merge(buttonProps, {
                  class: "basis-0 -ml-px !rounded-s-none border-l border-l-memo-active",
                })}
                onClick={popOver.open}
              >
                <AiFillCaretDown class="text-current" />
              </Button>
            )}
          >
            {popOverContents()}
          </PopOver>
        )}
      </Show>
    </div>
  );
};
