import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {svgDataURL} from "components/ui/FacilityIcon";
import {FieldBox} from "components/ui/form/FieldBox";
import {labelIdForField} from "components/ui/form/FieldLabel";
import {HideableSection} from "components/ui/HideableSection";
import {actionIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils/lang";
import {FiUpload} from "solid-icons/fi";
import {Show, VoidComponent, createSignal} from "solid-js";

interface Props {
  readonly name: string;
}

/**
 * A form field for an optional SVG icon. Shows the icon, which can be loaded from a file or
 * cleared. The SVG text can also be edited, with a live preview.
 */
export const FacilityIconField: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {form} = useFormContext();
  const [editing, setEditing] = createSignal(false);
  let fileInput: HTMLInputElement | undefined;
  const svg = () => {
    const value: string | undefined = form.data(props.name);
    return (value || "").trim();
  };
  function setSvg(value: string) {
    form.setFields(props.name, value);
    // Setting the value does not make the form dirty by itself.
    form.setIsDirty(true);
  }
  async function loadFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (file) {
      setSvg((await file.text()).trim());
      input.value = "";
    }
  }
  return (
    <FieldBox name={props.name}>
      <input
        ref={fileInput}
        id={`${props.name}_file`}
        type="file"
        class="hidden"
        accept=".svg,image/svg+xml"
        onChange={(e) => void loadFile(e.currentTarget)}
      />
      <div class="flex items-start gap-2">
        <div
          class="shrink-0 w-16 h-16 p-1 border border-input-border rounded-sm bg-white flex items-center justify-center"
          data-icon-preview
        >
          <Show when={svg()} fallback={<EmptyValueSymbol class="cursor-default select-none" />}>
            <img class="w-full h-full" src={svgDataURL(svg())} alt="" />
          </Show>
        </div>
        <div class="grow flex flex-col items-stretch gap-1">
          <div class="flex flex-wrap gap-1 items-baseline justify-between">
            <div class="flex gap-1">
              <Button class="secondary small" onClick={() => fileInput?.click()}>
                <FiUpload class="inlineIcon" /> {t("forms.facility_icon.load_from_file")}
              </Button>
              <Button class="secondary small" disabled={!svg()} onClick={() => setSvg("")}>
                <actionIcons.Delete class="inlineIcon" /> {t("actions.clear")}
              </Button>
            </div>
            <CheckboxInput
              id={`${props.name}_edit_svg`}
              label={<span class="font-normal">{t("forms.facility_icon.edit_svg")}</span>}
              checked={editing()}
              onChecked={setEditing}
            />
          </div>
          {/* The control stays in the form also when not editing, to keep the field's value. */}
          <HideableSection show={editing()}>
            <textarea
              id={props.name}
              name={props.name}
              class="w-full h-36 px-2 border border-input-border rounded-sm font-mono text-xs aria-invalid:border-red-400"
              spellcheck={false}
              aria-labelledby={labelIdForField(props.name)}
            />
          </HideableSection>
        </div>
      </div>
    </FieldBox>
  );
};
