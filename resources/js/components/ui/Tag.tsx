import {ParentComponent, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {bleachColor, randomColor} from "./colors";

interface TagProps extends htmlAttributes.div {
  readonly color: string;
}

export const Tag: ParentComponent<TagProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["color"]);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "border py-0.5 px-1 inline-block",
        style: {
          "color": props.color,
          "border-color": props.color,
          "border-radius": "0.7rem",
          "background-color": bleachColor(props.color, {amount: 0.8}),
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
    <Tag color={props.color || randomColor({seedString: props.colorSeed || props.text, whiteness: 10, blackness: 30})}>
      {props.text}
    </Tag>
  );
};

export const TagsLine: ParentComponent<htmlAttributes.div> = (props) => {
  return <div {...htmlAttributes.merge(props, {class: "flex flex-wrap gap-px"})} />;
};
