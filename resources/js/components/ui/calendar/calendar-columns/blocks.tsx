import {cx, htmlAttributes} from "components/utils";
import {ParentComponent, Show, VoidComponent, splitProps} from "solid-js";

interface PartDayBlockProps extends htmlAttributes.div {
  readonly label?: string;
  readonly hovered?: boolean;
  readonly onHoverChange?: (hovered: boolean) => void;
}

export const HoursAreaBlock: ParentComponent<PartDayBlockProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label", "hovered", "onHoverChange", "children"]);

  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: cx(
          "w-full h-full cursor-default",
          props.hovered ? "outline outline-2 outline-memo-active relative z-10 cursor-pointer" : undefined,
        ),
        style: {"outline-offset": "-2px"},
      })}
      onMouseEnter={() => props.onHoverChange?.(true)}
      onMouseLeave={() => props.onHoverChange?.(false)}
    >
      <Show when={props.label}>
        <div
          class="text-xs py-0.5 -mx-0.5 float-right text-nowrap rounded-se bg-white bg-opacity-50"
          style={{"writing-mode": "vertical-lr"}}
        >
          {props.label}
        </div>
      </Show>
      {props.children}
    </div>
  );
};

interface TimeBlockProps extends PartDayBlockProps {
  readonly onEditClick?: () => void;
}

export const TimeBlock: VoidComponent<TimeBlockProps> = (allProps) => {
  const [props, hProps] = splitProps(allProps, ["onEditClick"]);
  return (
    <HoursAreaBlock
      {...{
        ...hProps,
        ...(props.onEditClick
          ? {
              tabindex: 0,
              onClick: (e) => {
                e.stopPropagation();
                props.onEditClick?.();
              },
            }
          : undefined),
      }}
    />
  );
};
