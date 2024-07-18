import {createConfirmation} from "components/ui/confirmation";
import {LangFunc} from "components/utils/lang";
import {SeriesDeleteOption} from "data-access/memo-api/resources/meeting.resource";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createSelector, createSignal, Show} from "solid-js";
import {MeetingInSeriesInfo} from "./MeetingInSeriesInfo";

export type MeetingForDelete = Partial<Pick<TQMeetingResource, "interval" | "seriesNumber" | "seriesCount">>;

export async function confirmDelete(
  dialog: ReturnType<typeof createConfirmation>,
  t: LangFunc,
  meeting: MeetingForDelete,
): Promise<SeriesDeleteOption | undefined> {
  const [deleteOption, setDeleteOption] = createSignal(SeriesDeleteOption.ONE);
  const isSelected = createSelector(deleteOption);
  const seriesCount = meeting.seriesCount || 0;
  const seriesNumber = meeting.seriesNumber || 0;
  const countToDelete = () => {
    switch (deleteOption()) {
      case SeriesDeleteOption.ONE:
        return 1;
      case SeriesDeleteOption.FROM_THIS:
        return seriesCount - seriesNumber + 1;
      case SeriesDeleteOption.ALL:
        return seriesCount;
    }
  };
  const params = {
    title: t("forms.meeting_delete.form_name"),
    confirmText: <span>{t("forms.meeting_delete.submit", {count: countToDelete()})}</span>,
    body: () => (
      <>
        <div>{t("forms.meeting_delete.confirmation_text")}</div>

        <Show when={seriesCount > 1}>
          <div class="mt-4 mb-4">
            <div class="flex">
              <span class="mr-4">{t("forms.meeting_delete.series_info")}:</span>
              <MeetingInSeriesInfo meeting={meeting} />
            </div>
            <div class="mt-4">
              <label>
                <input
                  type="radio"
                  name="delete_option"
                  value={SeriesDeleteOption.ONE}
                  checked={isSelected(SeriesDeleteOption.ONE)}
                  onChange={() => setDeleteOption(SeriesDeleteOption.ONE)}
                />
                <span class="ml-1">{t("forms.meeting_delete.one")}</span>
              </label>
            </div>
            {/* 
                We only show functionally distinct options:
                - if the meeting is last in the series, we show ONE & ALL (FROM_THIS would be equivalent to ONE)
                - if the meeting is first in the series, we show ONE & FROM_THIS (ALL would be equivalent to FROM_THIS)
                - if the meeting is in the middle, we show all three options 
              */}
            <Show when={seriesNumber < seriesCount}>
              <div>
                <label>
                  <input
                    type="radio"
                    name="delete_option"
                    value={SeriesDeleteOption.FROM_THIS}
                    checked={isSelected(SeriesDeleteOption.FROM_THIS)}
                    onChange={() => setDeleteOption(SeriesDeleteOption.FROM_THIS)}
                  />
                  <span class="ml-1">
                    {t("forms.meeting_delete.from_this", {
                      // The message expects count of the following meetings, excluding the current one.
                      count: seriesCount - seriesNumber,
                    })}
                  </span>
                </label>
              </div>
            </Show>
            <Show when={seriesNumber > 1}>
              <div>
                <label>
                  <input
                    type="radio"
                    name="delete_option"
                    value={SeriesDeleteOption.ALL}
                    checked={isSelected(SeriesDeleteOption.ALL)}
                    onChange={() => setDeleteOption(SeriesDeleteOption.ALL)}
                  />
                  <span class="ml-1">
                    {t("forms.meeting_delete.all", {
                      count: seriesCount,
                    })}
                  </span>
                </label>
              </div>
            </Show>
          </div>
        </Show>
      </>
    ),
  };
  if (!(await dialog.confirm(params))) {
    return undefined;
  }
  // eslint-disable-next-line solid/reactivity
  return deleteOption();
}
