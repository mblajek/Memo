import {htmlAttributes} from "components/utils/html_attributes";
import {JSX, VoidComponent, splitProps} from "solid-js";

interface Props extends htmlAttributes.div {
  readonly label: () => JSX.Element;
}

/** The header for a calendar column representing a resource, e.g. a person. */
export const ResourceHeader: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["label"]);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "w-full flex flex-col justify-end px-1 overflow-clip",
      })}
    >
      {props.label()}
    </div>
  );
};
