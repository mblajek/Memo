import {ParentComponent, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {applyTextOpacity, bleachColor, randomColor} from "./colors";

interface TagProps extends htmlAttributes.div {
  readonly color: string;
}

export const Tag: ParentComponent<TagProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["color"]);
  const colorWithOpacity = () => applyTextOpacity(props.color);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "border py-0.5 px-1 inline-block",
        style: {
          "color": colorWithOpacity(),
          "border-color": colorWithOpacity(),
          "border-radius": "0.8em",
          "background-color": bleachColor(colorWithOpacity(), {amount: 0.85}),
        },
      })}
    />
  );
};

interface SimpleTagProps {
  readonly text: string;
  readonly color?: string;
  /**
   * The string used to randomly generate the tag color. Ignored if color is specified.
   * The text is used as the seed if neither color nor colorSeed is specified.
   */
  readonly colorSeed?: string;
}

export const SimpleTag: VoidComponent<SimpleTagProps> = (props) => {
  return (
    <Tag color={props.color || simpleTagRandomColor(props.colorSeed || props.text.trim().toLocaleLowerCase())}>
      {props.text}
    </Tag>
  );
};

export function simpleTagRandomColor(seedString: string) {
  return randomColor({seedString, lightness: [35, 55], chroma: [20, 60]});
}

export const TagsLine: ParentComponent<htmlAttributes.div> = (props) => {
  return <div {...htmlAttributes.merge(props, {class: "flex flex-wrap items-baseline gap-px"})} />;
};
