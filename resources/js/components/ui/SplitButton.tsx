import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {AiFillCaretDown} from "solid-icons/ai";
import {createSignal, ParentComponent, Show, splitProps} from "solid-js";
import {Button, ButtonProps} from "./Button";
import {PopOver, PopOverControl} from "./PopOver";
import {ChildrenOrFunc} from "./children_func";

interface Props extends ButtonProps {
  readonly divClass?: string;
  readonly popOver: ChildrenOrFunc<[PopOverControl]>;
  readonly parentPopOver?: PopOverControl;
}

export const SplitButton: ParentComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["divClass", "popOver", "parentPopOver"]);
  const [container, setContainer] = createSignal<HTMLDivElement>();
  return (
    <div ref={setContainer} class={cx(props.divClass, "flex items-stretch")}>
      <Button
        {...htmlAttributes.merge(buttonProps, {class: cx("flex-grow", props.popOver ? "!rounded-e-none" : undefined)})}
        titleTriggerTarget={container()}
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
                titleTriggerTarget={container()}
                onClick={popOver.open}
              >
                <AiFillCaretDown class="text-current" />
              </Button>
            )}
            parentPopOver={props.parentPopOver}
          >
            {popOverContents()}
          </PopOver>
        )}
      </Show>
    </div>
  );
};
