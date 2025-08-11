import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils/lang";
import {For, Show, VoidComponent} from "solid-js";

interface Props {
  readonly notes: readonly string[] | undefined;
  readonly showInfoIcon?: boolean;
}

export const ClientUrgentNotes: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <Show when={props.notes}>
      <div class="flex flex-wrap gap-1">
        <For each={props.notes}>
          {(note) => <span class="px-1 border border-s-4 border-red-600 rounded-md">{note}</span>}
        </For>
        <Show when={props.showInfoIcon ?? true}>
          <InfoIcon title={t("facility_user.client_urgent_notes.info")} />
        </Show>
      </div>
    </Show>
  );
};
