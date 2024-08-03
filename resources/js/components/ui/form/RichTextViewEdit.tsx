import {useFormContext} from "components/felte-form/FelteForm";
import {useLangFunc} from "components/utils";
import {Show, splitProps, VoidComponent} from "solid-js";
import {InfoIcon} from "../InfoIcon";
import {RichTextView} from "../RichTextView";
import {EmptyValueSymbol} from "../symbols";
import {FieldBox} from "./FieldBox";
import {MultilineTextField, MultilineTextFieldProps} from "./MultilineTextField";
import {PlaceholderField} from "./PlaceholderField";

interface Props extends Pick<MultilineTextFieldProps, "staticPersistenceKey" | "initialShowPreview"> {
  readonly name: string;
  readonly viewMode: boolean;
}

export const RichTextViewEdit: VoidComponent<Props> = (allProps) => {
  const [props, multilineTextFieldProps] = splitProps(allProps, ["name", "viewMode"]);
  const t = useLangFunc();
  const {form} = useFormContext();
  return (
    <Show
      when={props.viewMode}
      fallback={
        <MultilineTextField
          name={props.name}
          label={(origLabel) => (
            <>
              {origLabel} <InfoIcon href="/help/rich-text" title={t("rich_text_field")} />
            </>
          )}
          richTextPreview
          {...multilineTextFieldProps}
          data-felte-keep-on-remove
        />
      }
    >
      <FieldBox name={props.name}>
        <PlaceholderField name={props.name} />
        <RichTextView class="max-h-60" text={form.data(props.name) as string} fallback={<EmptyValueSymbol />} />
      </FieldBox>
    </Show>
  );
};
