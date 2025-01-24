import {htmlAttributes} from "components/utils/html_attributes";
import {JSX, splitProps, VoidComponent} from "solid-js";
import {StandaloneFieldLabel} from "./form/FieldLabel";

interface Props extends htmlAttributes.input {
  readonly label?: JSX.Element;
  readonly title?: string;
  readonly onChecked?: (checked: boolean) => void;
}

export const CheckboxInput: VoidComponent<Props> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["label", "title", "onChecked"]);
  return (
    <StandaloneFieldLabel title={props.title}>
      <input
        type="checkbox"
        {...htmlAttributes.merge(inputProps, {
          class: "m-px outline-1 aria-invalid:outline aria-invalid:outline-red-400",
          onChange: (e) => props.onChecked?.((e.target as HTMLInputElement).checked),
        })}
      />{" "}
      {props.label}
    </StandaloneFieldLabel>
  );
};
