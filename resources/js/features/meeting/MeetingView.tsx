import {createQuery} from "@tanstack/solid-query";
import {RichTextView} from "components/ui/RichTextView";
import {BigSpinner} from "components/ui/Spinner";
import {QueryBarrier, useLangFunc} from "components/utils";
import {useAttributes} from "data-access/memo-api/attributes";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {Api} from "data-access/memo-api/types";
import {Show, VoidComponent} from "solid-js";
import {MeetingDateAndTimeInfo} from "./DateAndTimeInfo";

interface Props {
  readonly id: Api.Id;
}

export const MeetingView: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const dictionaries = useDictionaries();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.id));
  const meeting = () => meetingQuery.data;
  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData>
      <Show when={attributes() && dictionaries() && meeting()} fallback={<BigSpinner />}>
        {(meeting) => (
          <div class="flex flex-col gap-3">
            <MeetingDateAndTimeInfo meeting={meeting()} />
            {/* TODO: Implement showing details. */}
            {/* <div class="flex gap-1">
            <div class="basis-0 grow">
              <MeetingTypeFields />
            </div>
            <div class="basis-0 grow">
              <DictionarySelect name="statusDictId" dictionary="meetingStatus" nullable={false} />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <MeetingAttendantsFields name="staff" />
            <MeetingAttendantsFields name="clients" showAttendanceStatusLabel={false} />
          </div>
          <CheckboxField name="isRemote" /> */}
            <RichTextView text={meeting().notes} />
            {/* <DictionarySelect name="resources" dictionary="meetingResource" multiple /> */}
          </div>
        )}
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default MeetingView;
