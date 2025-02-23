import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {JSX, VoidComponent, splitProps} from "solid-js";

interface Props extends htmlAttributes.div {
  readonly label: () => JSX.Element;
  readonly marked?: boolean;
}

/** The header for a calendar column representing a resource, e.g. a person. */
export const ResourceHeader: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label", "marked"]);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: cx(
          "w-full h-full flex flex-col justify-end px-0.5 overflow-clip",
          props.marked ? "border-x border-t rounded-t border-dotted border-memo-active" : undefined,
        ),
      })}
    >
      {props.label()}
    </div>
  );
};
