import {useFormContextIfInForm} from "components/felte-form";
import {Component} from "solid-js";
import {TranslatedText} from "..";

interface Props {
  fieldName: string;
  text?: string;
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
  const form = useFormContextIfInForm();
  return (
    <TranslatedText
      override={() => props.text}
      langFunc={[form?.translations?.fieldNames, props.fieldName]}
      capitalize={true}
      wrapIn={(text) => <label for={props.fieldName}>{text}</label>}
    />
  );
};
