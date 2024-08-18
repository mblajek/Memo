import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {htmlAttributes} from "components/utils";
import {JSX, ParentComponent, Show, VoidComponent, splitProps} from "solid-js";
import {title} from "../title";
import {TranslatedText} from "../TranslatedText";
import {LabelOverride, applyLabelOverride, getDirectLabelOverride} from "./labels";

const _DIRECTIVES_ = null && title;

interface Props extends htmlAttributes.label {
  readonly fieldName: string;
  /**
   * If specified, this label describes a collection of fields, and not a single field with exactly the same name.
   * Default: false.
   */
  readonly umbrella?: boolean;
  readonly label?: LabelOverride;
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
  const [props, labelProps] = splitProps(allProps, ["fieldName", "umbrella", "label", "wrapIn"]);
  const form = useFormContextIfInForm();
  return (
    <TranslatedText
      override={getDirectLabelOverride(props.label)}
      langFunc={form?.translations ? (o) => form.translations.fieldName(props.fieldName, o) : undefined}
      capitalize
      wrapIn={(text) => {
        const overridden = applyLabelOverride(text, props.label);
        return (
          <Show when={overridden} fallback={props.wrapIn?.(overridden)}>
            <StandaloneFieldLabel
              id={labelIdForField(props.fieldName)}
              for={props.umbrella ? undefined : props.fieldName}
              {...labelProps}
            >
              {props.wrapIn?.(overridden) ?? overridden}
            </StandaloneFieldLabel>
          </Show>
        );
      }}
    />
  );
};

export function labelIdForField(fieldName: string) {
  return fieldName ? `label_for_${fieldName}` : undefined;
}

export const StandaloneFieldLabel: ParentComponent<htmlAttributes.label> = (allProps) => {
  const [props, labelProps] = splitProps(allProps, ["title"]);
  return <label {...htmlAttributes.merge(labelProps, {class: "font-bold"})} use:title={props.title} />;
};
