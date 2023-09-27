import {useFormContextIfInForm} from "components/felte-form";
import {cx, htmlAttributes} from "components/utils";
import {JSX, splitProps, VoidComponent} from "solid-js";
import {TranslatedText} from "..";

interface Props extends htmlAttributes.label {
  fieldName: string;
  text?: string;
  /** Optional function that takes the label text and returns JSX. The result is then wrapped in label. */
  wrapIn?: (text: JSX.Element) => JSX.Element;
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
export const FieldLabel: VoidComponent<Props> = (props) => {
  const [localProps, labelProps] = splitProps(props, ["fieldName", "text", "wrapIn"]);
  const form = useFormContextIfInForm();
  return (
    <TranslatedText
      override={() => localProps.text}
      langFunc={[form?.translations?.fieldNames, localProps.fieldName]}
      capitalize={true}
      wrapIn={(text) => (
        <label for={localProps.fieldName} {...labelProps} class={cx("font-medium", labelProps.class)}>
          {localProps.wrapIn?.(text) ?? text}
        </label>
      )}
    />
  );
};
