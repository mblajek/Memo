import {Button} from "components/ui/Button";
import {ACTION_ICONS} from "components/ui/icons";
import {htmlAttributes} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {JSX, ParentComponent, Show, VoidComponent, splitProps} from "solid-js";

interface AllDayBlockProps extends htmlAttributes.div {
  readonly label: string | (() => JSX.Element);
}

export const AllDayAreaBlock: VoidComponent<AllDayBlockProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label"]);
  const label = () => {
    const propsLabel = props.label;
    return typeof propsLabel === "function" ? propsLabel() : propsLabel;
  };
  return <div {...htmlAttributes.merge(divProps, {class: "w-full h-full cursor-default p-0.5"})}>{label()}</div>;
};

interface PartDayBlockProps extends htmlAttributes.div {
  readonly label?: string;
}

export const HoursAreaBlock: ParentComponent<PartDayBlockProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label", "children"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: "w-full h-full cursor-default"})}>
      <Show when={props.label}>
        <div class="text-xs py-0.5 -mx-0.5 float-right" style={{"writing-mode": "vertical-lr"}}>
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
    <HoursAreaBlock {...hProps}>
      <Show when={isDEV() && props.onEditClick}>
        <Button
          class="absolute right-0 bottom-0"
          title="Edit the time block"
          onClick={(e) => {
            props.onEditClick?.();
            e.stopPropagation();
          }}
        >
          <ACTION_ICONS.edit class="text-gray-200" size="12" />
        </Button>
      </Show>
    </HoursAreaBlock>
  );
};
