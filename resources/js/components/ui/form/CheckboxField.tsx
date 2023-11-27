import {VoidComponent} from "solid-js";
import {FieldBox} from "./FieldBox";
import {FieldLabel, labelIdForField} from "./FieldLabel";

interface Props {
  readonly name: string;
  readonly label?: string;
  readonly disabled?: boolean;
  // TODO: Find a better solution for providing a hint like this.
  readonly title?: string;
}

/**
 * Wrapper of native HTML's `<input>` in the checkbox form.
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const CheckboxField: VoidComponent<Props> = (props) => (
  <FieldBox
    {...props}
    // Label already incorporated in the checkbox.
    label=""
  >
    <FieldLabel
      fieldName={props.name}
      text={props.label}
      class="flex items-baseline gap-1"
      title={props.title}
      wrapIn={(text) => (
        <>
          <input
            type="checkbox"
            id={props.name}
            name={props.name}
            class="border border-input-border m-px outline-1 aria-invalid:outline aria-invalid:outline-red-400"
            aria-labelledby={labelIdForField(props.name)}
            disabled={props.disabled}
          />
          <span class="flex-grow">{text}</span>
        </>
      )}
    />
  </FieldBox>
);