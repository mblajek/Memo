import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {htmlAttributes} from "components/utils";
import {JSX, Show, VoidComponent, splitProps} from "solid-js";
import {TranslatedText} from "../TranslatedText";

interface Props extends htmlAttributes.label {
  readonly fieldName: string;
  readonly text?: string;
  /** Optional function that takes the label text and returns JSX. The result is then wrapped in label. */
  readonly wrapIn?: (text: JSX.Element) => JSX.Element;
}

/**
 * Label element for a field. It can be used for fields inside a FelteForm, as well as for standalone
 * fields (but then the text prop should be specified).
 *
 * If the text is specified, it is displayed directly.
 * Otherwise, if the label is used inside FelteFrom, name of the field is taken from the translations
 * provided by the form (and capitalised).
 * Otherwise, the label is not present.
 */
export const FieldLabel: VoidComponent<Props> = (allProps) => {
  const [props, labelProps] = splitProps(allProps, ["fieldName", "text", "wrapIn"]);
  const form = useFormContextIfInForm();
  return (
    <TranslatedText
      override={() => props.text}
      langFunc={[form?.translations?.fieldNames, props.fieldName]}
      capitalize
      wrapIn={(text) => (
        <Show when={text !== undefined}>
          <label
            id={labelIdForField(props.fieldName)}
            for={props.fieldName}
            {...htmlAttributes.merge(labelProps, {class: "font-medium"})}
          >
            {props.wrapIn?.(text) ?? text}
          </label>
        </Show>
      )}
    />
  );
};

export function labelIdForField(fieldName: string) {
  return fieldName ? `label_for_${fieldName}` : undefined;
}
