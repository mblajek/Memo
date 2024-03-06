import {htmlAttributes} from "components/utils";
import {JSX, Show, VoidComponent, splitProps} from "solid-js";

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

export const HoursAreaBlock: VoidComponent<PartDayBlockProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: "w-full h-full cursor-default"})}>
      <Show when={props.label}>
        <div class="text-xs py-0.5 -mx-0.5 float-right" style={{"writing-mode": "vertical-lr"}}>
          {props.label}
        </div>
      </Show>
    </div>
  );
};
