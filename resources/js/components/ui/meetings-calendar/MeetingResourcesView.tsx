import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {For, JSX, Show, VoidComponent} from "solid-js";
import {calendarIcons} from "../icons";

interface Props {
  readonly resourceIds: readonly string[];
  readonly conflictingResourceIds?: readonly string[];
  readonly fallback?: JSX.Element;
}

export const MeetingResourcesView: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  return (
    <Show when={props.resourceIds.length} fallback={props.fallback}>
      <div class="flex flex-wrap gap-0.5" style={{"line-height": "initial"}}>
        <For each={props.resourceIds}>
          {(id) => {
            const position = () => dictionaries()?.getPositionById(id);
            const hasConflict = () => props.conflictingResourceIds?.includes(id);
            return (
              <div
                class={cx(
                  "min-h-5 px-0.5 border border-gray-400 bg-black/5 rounded-sm whitespace-nowrap flex gap-0.5 items-center",
                  hasConflict() ? "text-red-600" : position()?.disabled ? "text-grey-text" : undefined,
                )}
              >
                {position()?.label}
                <Show when={hasConflict()}>
                  <calendarIcons.Conflict class="text-current" size="1em" />
                </Show>
                <Show when={position()?.disabled}>
                  <span class="ml-1 text-grey-text">{t("position_disabled_suffix")}</span>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
