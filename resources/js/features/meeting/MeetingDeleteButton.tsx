import {DeleteButton} from "components/ui/Button";
import {ConfirmParams, createConfirmation} from "components/ui/confirmation";
import {htmlAttributes} from "components/utils";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {SeriesDeleteOption} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {TOptions} from "i18next";
import {Accessor, createMemo, createSignal, Show, splitProps, VoidComponent} from "solid-js";
import {MeetingInSeriesInfo} from "./MeetingInSeriesInfo";
import {useMeetingAPI} from "./meeting_api";

export type MeetingForDelete = Partial<
  Pick<TQMeetingResource, "id" | "categoryDictId" | "typeDictId" | "interval" | "seriesNumber" | "seriesCount">
>;

interface Props extends htmlAttributes.button {
  readonly meeting: MeetingForDelete;
  readonly onDeleted?: (count: number) => void;
}

export const MeetingDeleteButton: VoidComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["meeting", "onDeleted"]);
  const t = useLangFunc();
  const meetingAPI = useMeetingAPI();
  const invalidate = useInvalidator();
  const confirmation = createConfirmation();
  const {meetingTypeDict, meetingCategoryDict} = useFixedDictionaries();
  const formId = createMemo(() =>
    props.meeting.categoryDictId !== meetingCategoryDict()?.system.id
      ? "meeting_delete"
      : props.meeting.typeDictId === meetingTypeDict()?.work_time.id ||
          props.meeting.typeDictId === meetingTypeDict()?.leave_time.id
        ? "work_time_delete"
        : "meeting_delete",
  );

  function tt(subkey: string, options?: TOptions) {
    return t(`forms.${formId()}.${subkey}`, options);
  }

  async function deleteMeeting(deleteOption: SeriesDeleteOption | undefined) {
    // deleteOption is undefined if confirmation was skipped with ctrl+alt - in this case we default to "one"
    deleteOption ||= "one";
    const {count} = await meetingAPI.delete(props.meeting.id!, deleteOption);
    toastSuccess(tt("success", {count}));
    props.onDeleted?.(count);
    invalidate.facility.meetings();
  }

  async function confirmDelete(meeting: Accessor<MeetingForDelete>): Promise<SeriesDeleteOption | undefined> {
    const [deleteOption, setDeleteOption] = createSignal<SeriesDeleteOption>("one");
    const seriesCount = () => meeting().seriesCount || 0;
    const seriesNumber = () => meeting().seriesNumber || 0;
    const countToDelete = () => {
      switch (deleteOption()) {
        case "one":
          return 1;
        case "from_this":
          return seriesCount() - seriesNumber() + 1;
        case "all":
          return seriesCount();
      }
    };
    const params = {
      title: tt("form_name"),
      confirmText: () => <span>{tt("submit", {count: countToDelete()})}</span>,
      body: () => (
        <Show when={seriesCount() > 1} fallback={tt("confirmation_text")}>
          <div class="mb-4">
            <div class="flex">
              <span class="mr-4">{tt("series_info")}:</span>
              <MeetingInSeriesInfo meeting={meeting()} />
            </div>
            <div class="mt-4">
              <label>
                <input
                  type="radio"
                  name="delete_option"
                  value="one"
                  checked={deleteOption() === "one"}
                  onChange={[setDeleteOption, "one"]}
                />
                <span class="ml-1">{tt("one")}</span>
              </label>
            </div>
            {
              // We only show functionally distinct options. If the meeting is first or last in the series, FROM_THIS is
              // not needed - it would be equivalent to either ALL (if first) or ONE (if last).
            }
            <Show when={seriesNumber() > 1 && seriesNumber() < seriesCount()}>
              <div>
                <label>
                  <input
                    type="radio"
                    name="delete_option"
                    value="from_this"
                    checked={deleteOption() === "from_this"}
                    onChange={[setDeleteOption, "from_this"]}
                  />
                  <span class="ml-1">
                    {tt("from_this", {
                      // The message expects count of the following meetings, excluding the current one.
                      count: seriesCount() - seriesNumber(),
                    })}
                  </span>
                </label>
              </div>
            </Show>
            <div>
              <label>
                <input
                  type="radio"
                  name="delete_option"
                  value="all"
                  checked={deleteOption() === "all"}
                  onChange={[setDeleteOption, "all"]}
                />
                <span class="ml-1">{tt("all", {count: seriesCount()})}</span>
              </label>
            </div>
          </div>
        </Show>
      ),
    } satisfies ConfirmParams;
    if (!(await confirmation.confirm(params))) {
      return undefined;
    }
    // eslint-disable-next-line solid/reactivity
    return deleteOption();
  }

  const meetingForDelete = () => {
    if (props.meeting.typeDictId === meetingTypeDict()?.work_time.id) {
      // No series deleting for work time.
      return {...props.meeting, seriesNumber: undefined, seriesCount: undefined};
    }
    return props.meeting;
  };

  return (
    <Show when={props.meeting.id}>
      <DeleteButton
        {...buttonProps}
        confirm={() => confirmDelete(meetingForDelete)}
        delete={(deleteOption) => deleteMeeting(deleteOption)}
      />
    </Show>
  );
};
