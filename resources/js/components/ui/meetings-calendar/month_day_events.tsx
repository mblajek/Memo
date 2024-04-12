import {ButtonLike} from "components/ui/ButtonLike";
import {ACTION_ICONS} from "components/ui/icons";
import {htmlAttributes} from "components/utils";
import {MAX_DAY_MINUTE, formatDayMinuteHM} from "components/utils/day_minute_util";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {For, Show, VoidComponent, splitProps} from "solid-js";
import {RichTextView} from "../RichTextView";
import {EN_DASH} from "../symbols";
import {HoverableMeetingEventBlock, HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MeetingHoverCard} from "./MeetingHoverCard";
import {coloringToStyle} from "./colors";

interface Props extends Pick<HoverableMeetingEventBlockProps, "meeting" | "plannedColoring" | "blink"> {
  readonly height?: number;
  readonly onClick?: () => void;
}

const DEFAULT_HEIGHT = 30;
const MAX_NUM_CLIENTS = 3;

export const MonthDayMeetingEventBlock: VoidComponent<Props> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["height", "onClick"]);
  const {dictionaries, meetingTypeDict} = useFixedDictionaries();
  const meeting = () => blockProps.meeting;
  return (
    <HoverableMeetingEventBlock
      {...blockProps}
      contents={(allContentsProps) => {
        const [contentsProps, divProps] = splitProps(allContentsProps, ["hovered", "coloring"]);
        return (
          <ButtonLike
            {...htmlAttributes.merge(divProps, {
              class: "border rounded cursor-pointer select-none relative",
              style: {
                height: `${props.height || DEFAULT_HEIGHT}px`,
                ...coloringToStyle(contentsProps.coloring, {hover: contentsProps.hovered}),
              },
            })}
            // Needed to make the event clickable on a touch screen.
            onPointerUp={(e) => {
              if (e.button === 0) {
                props.onClick?.();
              }
            }}
          >
            <div class="w-max flex flex-col items-stretch gap-px bg-inherit">
              <div class="flex gap-0.5">
                <span
                  class="px-0.5 font-weight-medium rounded-ee"
                  style={coloringToStyle(contentsProps.coloring, {part: "header"})}
                >
                  {formatDayMinuteHM(meeting().startDayminute)}
                </span>
                <Show when={dictionaries()}>
                  <For each={meeting().clients.slice(0, MAX_NUM_CLIENTS + 1)}>
                    {(client, ind) => (
                      <Show when={ind() < MAX_NUM_CLIENTS} fallback={"…"}>
                        <UserLink icon="tiny" type="clients" link={false} userId={client.userId} name={client.name} />
                      </Show>
                    )}
                  </For>
                </Show>
              </div>
              <Show when={dictionaries()}>
                <div class="px-0.5">
                  <MeetingStatusTags meeting={meeting()} />
                  <Show
                    when={meeting().typeDictId !== meetingTypeDict()?.other.id}
                    fallback={<RichTextView class="overflow-y-clip" text={meeting().notes || undefined} />}
                  >
                    <div>{dictionaries()?.getPositionById(meeting().typeDictId).label}</div>
                  </Show>
                </div>
                <Show when={meeting().fromMeetingId}>
                  <div class="absolute bottom-0 right-0 bg-inherit rounded">
                    <ACTION_ICONS.repeat />
                  </div>
                </Show>
              </Show>
            </div>
          </ButtonLike>
        );
      }}
      hoverCard={() => <MeetingHoverCard meeting={meeting()} />}
    />
  );
};

interface MonthDayWorkTimeProps {
  readonly meeting: TQMeetingResource;
}

export const MonthDayWorkTime: VoidComponent<MonthDayWorkTimeProps> = (props) => (
  <span class="whitespace-nowrap select-none">
    {formatDayMinuteHM(props.meeting.startDayminute)}
    {EN_DASH}
    {formatDayMinuteHM((props.meeting.startDayminute + props.meeting.durationMinutes) % MAX_DAY_MINUTE)}
  </span>
);
