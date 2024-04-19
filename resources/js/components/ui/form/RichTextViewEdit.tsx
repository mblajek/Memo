import {useFormContext} from "components/felte-form/FelteForm";
import {useLangFunc} from "components/utils";
import {Show, VoidComponent} from "solid-js";
import {InfoIcon} from "../InfoIcon";
import {RichTextView} from "../RichTextView";
import {EmptyValueSymbol} from "../symbols";
import {FieldBox} from "./FieldBox";
import {MultilineTextField} from "./MultilineTextField";
import {PlaceholderField} from "./PlaceholderField";

interface Props {
  readonly name: string;
  readonly viewMode: boolean;
}

export const RichTextViewEdit: VoidComponent<Props> = (props) => {
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
