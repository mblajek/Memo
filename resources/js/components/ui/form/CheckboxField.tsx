import {JSX, VoidComponent} from "solid-js";
import {FieldBox} from "./FieldBox";
import {FieldLabel, labelIdForField} from "./FieldLabel";

type Props = {
  readonly name: string;
  readonly label?: JSX.Element;
  readonly disabled?: boolean;
  // TODO: Find a better solution for providing a hint like this.
  readonly title?: string;
} & {
  readonly "data-felte-keep-on-remove"?: true;
};

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
      class="self-start flex items-baseline gap-1"
      title={props.title}
      wrapIn={(text) => (
        <>
          <input
            type="checkbox"
            id={props.name}
            name={props.name}
            class="m-px outline-1 aria-invalid:outline aria-invalid:outline-red-400"
            aria-labelledby={text === undefined ? undefined : labelIdForField(props.name)}
            disabled={props.disabled}
            data-felte-keep-on-remove={props["data-felte-keep-on-remove"]}
          />
          {text}
        </>
      )}
    />
  </FieldBox>
);
