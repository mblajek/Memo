import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {title} from "components/ui/title";
import {URGENT_NOTE_LOW_PRIORITY_PREFIX, UrgentNoteData} from "components/ui/urgent_notes";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {For, Show, splitProps, VoidComponent} from "solid-js";

type _Directives = typeof title;

interface Props extends htmlAttributes.div {
  readonly notes: readonly UrgentNoteData[];
  readonly showInfoIcon?: boolean;
}

export const UrgentNotes: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["notes", "showInfoIcon"]);
  const t = useLangFunc();
  return (
    <Show when={props.notes.length}>
      <div {...htmlAttributes.merge(divProps, {class: "flex flex-wrap gap-1"})}>
        <For each={props.notes}>
          {(note) => (
            <span
              class={cx(
                "px-1 border border-purple-600 bg-purple-50 rounded-md overflow-clip",
                note.priority === "normal" ? "border-s-8" : undefined,
              )}
            >
              <Show when={note.priority === "low"}>
                <span
                  class="-ms-1 pe-px text-purple-400 font-bold select-none"
                  use:title={t("facility_user.client_urgent_notes.low_priority_info")}
                >
                  {URGENT_NOTE_LOW_PRIORITY_PREFIX}
                </span>
              </Show>
              {note.text}
            </span>
          )}
        </For>
        <Show when={props.showInfoIcon ?? true}>
          <DocsModalInfoIcon href="/help/client-urgent-notes" title={t("facility_user.client_urgent_notes.info")} />
        </Show>
      </div>
    </Show>
  );
};
