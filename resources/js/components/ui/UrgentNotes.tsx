import {InfoIcon} from "components/ui/InfoIcon";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {For, Show, splitProps, VoidComponent} from "solid-js";

interface Props extends htmlAttributes.div {
  readonly notes: readonly string[] | undefined;
  readonly showInfoIcon?: boolean;
}

export const UrgentNotes: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["notes", "showInfoIcon"]);
  const t = useLangFunc();
  return (
    <Show when={props.notes}>
      <div {...htmlAttributes.merge(divProps, {class: "flex flex-wrap gap-1"})}>
        <For each={props.notes}>
          {(note) => <span class="px-1 border border-s-4 border-purple-600 bg-purple-50 rounded-md">{note}</span>}
        </For>
        <Show when={props.showInfoIcon ?? true}>
          <InfoIcon title={t("facility_user.client_urgent_notes.info")} />
        </Show>
      </div>
    </Show>
  );
};
