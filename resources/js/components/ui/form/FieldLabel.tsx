import {useFormContextIfInForm} from "components/felte-form";
import {Component, Show, createMemo} from "solid-js";

interface Props {
  fieldName: string;
  text?: string;
}

interface Data {
  text: string;
  capitalize: boolean;
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
export const FieldLabel: Component<Props> = (props) => {
  const getFormFieldName = useFormContextIfInForm()?.translations.getFieldName;
  const data = createMemo((): Data => {
    if (props.text !== undefined) {
      return {text: props.text, capitalize: false};
    }
    if (getFormFieldName) {
      return {text: getFormFieldName(props.fieldName), capitalize: true};
    }
    return {text: "", capitalize: false};
  });
  return (
    <Show when={data().text}>
      <label for={props.fieldName} class="inline-block" classList={{"first-letter:capitalize": data().capitalize}}>
        {data().text}
      </label>
    </Show>
  );
};
