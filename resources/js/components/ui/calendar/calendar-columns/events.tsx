import * as hoverCard from "@zag-js/hover-card";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {ButtonLike} from "components/ui/ButtonLike";
import {Capitalize} from "components/ui/Capitalize";
import {RichTextView} from "components/ui/RichTextView";
import {bleachColor} from "components/ui/colors";
import {EM_DASH, EN_DASH} from "components/ui/symbols";
import {NON_NULLABLE, cx, useLangFunc} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingDateAndTimeInfo} from "features/meeting/DateAndTimeInfo";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {MeetingAttendanceStatus} from "features/meeting/attendance_status_info";
import {For, ParentComponent, Show, VoidComponent, createMemo, createSignal, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {useColumnsCalendar} from "../ColumnsCalendar";
import {CANCELLED_MEETING_COLORING, COMPLETED_MEETING_COLORING, Coloring} from "../colors";
import s from "./events.module.scss";

interface AllDayEventProps {
  readonly baseColor: string;
}

export const AllDayEventBlock: ParentComponent<AllDayEventProps> = (props) => (
  <div
    class="w-full h-full border rounded px-0.5 overflow-clip cursor-pointer"
    style={{
      "border-color": props.baseColor,
      "background-color": bleachColor(props.baseColor),
    }}
  >
    {props.children}
  </div>
);

interface MeetingEventProps {
  readonly meeting: TQMeetingResource;
  /** The colors of the event block, if it is a planned event. */
  readonly plannedColoring: Coloring;
  /** Whether the event block should blink initially to call the user's attention. */
  readonly blink?: boolean;
  readonly onHoverChange?: (hovered: boolean) => void;
  /** Whether the hovered style should be used. If not provided, the real element hover state is used. */
  readonly hovered?: boolean;
  readonly onClick?: () => void;
}

const DISAPPEAR_MILLIS = 300;

export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {meetingStatusDict} = useFixedDictionaries();
  const calendar = useColumnsCalendar();
  const resources = () =>
    props.meeting.resources
      .map((r) => dictionaries()?.getPositionById(r.resourceDictId).label)
      .filter(NON_NULLABLE)
      // Join by comma because Intl.ListFormat doesn't seem to work very well in Polish.
      .join(", ");
  /** The boundary for the hovers. Allow the full width of the page. */
  const boundary = () => {
    const areaRect = calendar.hoursArea().getBoundingClientRect();
    return {
      x: 0,
      width: document.body.clientWidth,
      y: areaRect.y - 20,
      height: areaRect.height,
    };
  };
  const [hoverState, hoverSend] = useMachine(
    hoverCard.machine({
      id: createUniqueId(),
      closeDelay: DISAPPEAR_MILLIS,
      positioning: {
        boundary,
        gutter: 0,
        strategy: "absolute",
        placement: "right-start",
        overflowPadding: 0,
        flip: true,
      },
    }),
    // Make sure the hover is not opened initially - this causes the position to be calculated incorrectly.
    // This is a workaround for what seems to be a zag bug.
    {context: () => ({openDelay: dictionaries() ? 100 : 2000})},
  );
  const hoverApi = createMemo(() => hoverCard.connect(hoverState, hoverSend, normalizeProps));
  const [hoveredGetter, hoveredSetter] = createSignal(false);
  function setHovered(hovered: boolean) {
    hoveredSetter(hovered);
    props.onHoverChange?.(hovered);
  }
  const hovered = () => props.hovered ?? hoveredGetter();
  const coloringStyle = () => {
    const coloring =
      props.meeting.statusDictId === meetingStatusDict()?.planned.id
        ? props.plannedColoring
        : props.meeting.statusDictId === meetingStatusDict()?.completed.id
          ? COMPLETED_MEETING_COLORING
          : props.meeting.statusDictId === meetingStatusDict()?.cancelled.id
            ? CANCELLED_MEETING_COLORING
            : undefined;
    return hovered() ? coloring?.hover : coloring?.regular;
  };
  return (
    <>
      <ButtonLike
        class={cx(
          "w-full h-full border rounded px-0.5 overflow-clip flex flex-col items-stretch cursor-pointer select-none",
          {[s.blink!]: props.blink},
        )}
        style={coloringStyle()}
        {...hoverApi().triggerProps}
        onMouseEnter={[setHovered, true]}
        onMouseLeave={[setHovered, false]}
        onClick={() => props.onClick?.()}
      >
        <div class="whitespace-nowrap">
          <span class="font-weight-medium">{formatDayMinuteHM(props.meeting.startDayminute)}</span>
          {EN_DASH}
          <span class="font-weight-medium">
            {formatDayMinuteHM(props.meeting.startDayminute + props.meeting.durationMinutes)}
          </span>
        </div>
        <hr class="border-inherit" />
        <Show when={dictionaries()}>
          <Show when={props.meeting.clients.length}>
            <ul>
              <For each={props.meeting.clients}>
                {(client) => <AttendantListItem type="clients" attendant={client} />}
              </For>
            </ul>
          </Show>
          <div>{dictionaries()?.getPositionById(props.meeting.typeDictId).label}</div>
          <MeetingStatusTags meeting={props.meeting} />
          <RichTextView text={props.meeting.notes} />
          <Show when={props.meeting.resources.length}>
            <div>{t("parenthesised", {text: resources()})}</div>
          </Show>
        </Show>
      </ButtonLike>
      <Show when={dictionaries() && hoverApi().isOpen}>
        <Portal>
          <div {...hoverApi().positionerProps} class="pointer-events-auto">
            <div {...hoverApi().contentProps} class="z-modal">
              <div
                class={cx("max-w-sm bg-white border border-gray-400 rounded shadow p-2 flex flex-col gap-2 text-sm", {
                  "opacity-0": !hovered(),
                })}
                style={{transition: `opacity ${DISAPPEAR_MILLIS}ms ease`}}
                onMouseEnter={() => hoverApi().close()}
              >
                <MeetingDateAndTimeInfo meeting={props.meeting} twoLines />
                <div>{dictionaries()?.getPositionById(props.meeting.typeDictId).label}</div>
                <MeetingStatusTags meeting={props.meeting} />
                <Show when={props.meeting.staff.length}>
                  <ul>
                    <For each={props.meeting.staff}>
                      {(staff) => <AttendantListItem type="staff" attendant={staff} showAttendance />}
                    </For>
                  </ul>
                </Show>
                <Show when={props.meeting.clients.length}>
                  <ul>
                    <For each={props.meeting.clients}>
                      {(client) => <AttendantListItem type="clients" attendant={client} showAttendance />}
                    </For>
                  </ul>
                </Show>
                <Show when={props.meeting.notes}>
                  <FieldDisp field="notes">
                    <RichTextView text={props.meeting.notes} />
                  </FieldDisp>
                </Show>
                <Show when={props.meeting.resources.length}>
                  <FieldDisp field="resources">
                    <div class="wrapText">{resources()}</div>
                  </FieldDisp>
                </Show>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};

interface AttendantListItemProps {
  readonly type: FacilityUserType;
  readonly attendant: TQMeetingAttendantResource;
  readonly showAttendance?: boolean;
}

const AttendantListItem: VoidComponent<AttendantListItemProps> = (props) => {
  const {attendanceStatusDict} = useFixedDictionaries();
  return (
    <li>
      <UserLink type={props.type} link={false} userId={props.attendant.userId} name={props.attendant.name} />
      <Show when={props.showAttendance && props.attendant.attendanceStatusDictId !== attendanceStatusDict()?.ok.id}>
        {" "}
        <span class="text-grey-text">
          {EM_DASH} <MeetingAttendanceStatus attendanceStatusId={props.attendant.attendanceStatusDictId} />
        </span>
      </Show>
    </li>
  );
};

interface FieldLabelProps {
  readonly field: string;
}

const FieldDisp: ParentComponent<FieldLabelProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col">
      <div class="font-medium">
        <Capitalize
          text={t("with_colon", {text: t([`models.meeting.${props.field}`, `models.generic.${props.field}`])})}
        />
      </div>
      <div>{props.children}</div>
    </div>
  );
};
