import {Capitalize} from "components/ui/Capitalize";
import {Select} from "components/ui/form/Select";
import {facilityIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {Dictionaries} from "data-access/memo-api/dictionaries";
import {MeetingResource, MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {WorkTimeFormType} from "./WorkTimeForm";

interface Props {
  readonly availableStaff: string | undefined;
}

const WORK_TIME_STAFF_FACILITY_WIDE = "-";

export const WorkTimeStaffSelectField: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <Select
      name="staff"
      items={[
        ...(props.availableStaff && props.availableStaff !== WORK_TIME_STAFF_FACILITY_WIDE
          ? [
              {
                value: props.availableStaff,
                label: () => <UserLink type="staff" userId={props.availableStaff} link={false} />,
              },
            ]
          : []),
        {
          value: WORK_TIME_STAFF_FACILITY_WIDE,
          label: () => (
            <span>
              <facilityIcons.Facility class="inlineIcon" size="18" /> <Capitalize text={t("meetings.facility_wide")} />
            </span>
          ),
        },
      ]}
      nullable={false}
    />
  );
};

export function staffInitialValue(workTime: MeetingResource) {
  return {staff: workTime.staff[0]?.userId || WORK_TIME_STAFF_FACILITY_WIDE};
}

export function getStaffValueForCreate(dictionaries: Dictionaries, value: Pick<WorkTimeFormType, "staff">) {
  return {
    staff:
      value.staff && value.staff !== WORK_TIME_STAFF_FACILITY_WIDE
        ? [{userId: value.staff, attendanceStatusDictId: dictionaries.get("attendanceStatus").get("ok").id}]
        : [],
  } satisfies Pick<MeetingResourceForCreate, "staff">;
}

export function getStaffValueForPatch(dictionaries: Dictionaries, value: Partial<Pick<WorkTimeFormType, "staff">>) {
  return value.staff == undefined
    ? {staff: undefined}
    : getStaffValueForCreate(dictionaries, value as Pick<WorkTimeFormType, "staff">);
}
