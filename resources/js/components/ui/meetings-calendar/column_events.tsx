import {ButtonLike} from "components/ui/ButtonLike";
import {RichTextView} from "components/ui/RichTextView";
import {ACTION_ICONS} from "components/ui/icons";
import {EN_DASH} from "components/ui/symbols";
import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, crossesDateBoundaries, formatDayMinuteHM} from "components/utils/day_minute_util";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, createMemo, splitProps} from "solid-js";
import {SeparatedSections} from "../SeparatedSections";
import {useColumnsCalendar} from "../calendar/ColumnsCalendar";
import {AllDayTimeSpan, PartDayTimeSpan, TimeSpan} from "../calendar/types";
import {HoverableMeetingEventBlock, HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MeetingHoverCard} from "./MeetingHoverCard";
import {MIDNIGHT_CROSSING_SYMBOL, coloringToStyle} from "./colors";
import {AttendantListItem} from "./meeting_details";

interface CommonProps
  extends Pick<
    HoverableMeetingEventBlockProps,
    "meeting" | "plannedColoring" | "blink" | "hovered" | "onHoverChange" | "entityId"
  > {
  readonly day: DateTime;
  readonly timeSpan: TimeSpan;
  readonly height?: number;
  readonly onClick?: () => void;
}

interface AllDayEventProps extends CommonProps {
  readonly timeSpan: AllDayTimeSpan;
}

const DEFAULT_HEIGHT = 30;
const MAX_NUM_CLIENTS = 3;

/** A block representing an all day meeting in the all day area of the calendar (above the hours area). */
export const AllDayEventBlock: VoidComponent<AllDayEventProps> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["day", "timeSpan", "height", "onClick"]);
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
              class: "px-0.5 border rounded flex flex-col items-stretch min-h-0 cursor-pointer select-none relative",
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
            <Show when={dictionaries()}>
              <div class="w-max flex gap-0.5">
                <For each={meeting().clients.slice(0, MAX_NUM_CLIENTS + 1)}>
                  {(client, ind) => (
                    <Show when={ind() < MAX_NUM_CLIENTS} fallback={"…"}>
                      <UserLink icon="tiny" type="clients" link={false} userId={client.userId} name={client.name} />
                    </Show>
                  )}
                </For>
              </div>
              <MeetingStatusTags meeting={meeting()} />
              <Show
                when={meeting().typeDictId !== meetingTypeDict()?.other.id}
                fallback={<RichTextView class="overflow-y-clip" text={meeting().notes || undefined} />}
              >
                <div>{dictionaries()?.getPositionById(meeting().typeDictId).label}</div>
              </Show>
              <Show when={meeting().fromMeetingId}>
                <div class="absolute bottom-px right-1 bg-inherit rounded">
                  <ACTION_ICONS.repeat />
                </div>
              </Show>
            </Show>
          </ButtonLike>
        );
      }}
      hoverCard={() => <MeetingHoverCard meeting={blockProps.meeting} />}
    />
  );
};

interface MeetingEventProps extends CommonProps {
  readonly timeSpan: PartDayTimeSpan;
}

/** A block representing a meeting in the hours area of the calendar. */
export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["day", "timeSpan", "onClick"]);
  const t = useLangFunc();
  const {dictionaries, meetingTypeDict} = useFixedDictionaries();
  const calendar = useColumnsCalendar();
  const meeting = () => blockProps.meeting;
  const boundary = () => {
    const areaRect = calendar.hoursArea().getBoundingClientRect();
    return {
      x: 0,
      // Allow the full width of the page.
      width: document.body.clientWidth,
      y: areaRect.y - 20,
      height: areaRect.height,
    };
  };
  const crosses = createMemo(() => crossesDateBoundaries(props.day, props.timeSpan));
  return (
    <HoverableMeetingEventBlock
      {...blockProps}
      contents={(allContentsProps) => {
        const [contentsProps, divProps] = splitProps(allContentsProps, ["hovered", "coloring"]);
        return (
          <ButtonLike
            {...htmlAttributes.merge(divProps, {
              class: cx(
                "w-full h-full border rounded flex flex-col items-stretch cursor-pointer select-none",
                crosses().fromPrevDay ? "border-t-0 rounded-t-none" : undefined,
                crosses().toNextDay ? "border-b-0 rounded-b-none" : undefined,
              ),
              style: coloringToStyle(contentsProps.coloring, {hover: contentsProps.hovered}),
            })}
            // Needed to make the event clickable on a touch screen.
            onPointerUp={(e) => {
              if (e.button === 0) {
                props.onClick?.();
              }
            }}
          >
            <div class="px-0.5 whitespace-nowrap" style={coloringToStyle(contentsProps.coloring, {part: "header"})}>
              {crosses().fromPrevDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
              <span class="font-weight-medium">{formatDayMinuteHM(props.timeSpan.startDayMinute)}</span>
              {EN_DASH}
              <span class="font-weight-medium">
                {formatDayMinuteHM((props.timeSpan.startDayMinute + props.timeSpan.durationMinutes) % MAX_DAY_MINUTE)}
              </span>
              {crosses().toNextDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
            </div>
            <Show when={dictionaries()}>
              <div class="px-0.5 pt-px flex flex-col min-h-0">
                <SeparatedSections
                  separator={(show) => (
                    <Show when={show()}>
                      <hr class="-mx-1 my-px" style={coloringToStyle(contentsProps.coloring, {part: "separator"})} />
                    </Show>
                  )}
                >
                  <ul>
                    <For each={meeting().clients}>
                      {(client) => <AttendantListItem type="clients" attendant={client} />}
                    </For>
                  </ul>
                  <Show when={meeting().typeDictId !== meetingTypeDict()?.other.id}>
                    <div>{dictionaries()?.getPositionById(meeting().typeDictId).label}</div>
                  </Show>
                  <MeetingStatusTags meeting={meeting()} />
                  <Show when={meeting().notes}>
                    <RichTextView
                      class={cx(
                        "grow shrink overflow-y-clip !overflow-x-visible",
                        meeting().resources.length ? "min-h-px" : undefined,
                      )}
                      text={meeting().notes!}
                    />
                  </Show>
                  <Show when={meeting().resources.length}>
                    <div>
                      {t("parenthesised", {
                        text: meeting()
                          .resources.map((r) => dictionaries()?.getPositionById(r.resourceDictId).label)
                          // Join by comma because Intl.ListFormat doesn't seem to work very well in Polish.
                          .join(", "),
                      })}
                    </div>
                  </Show>
                </SeparatedSections>
              </div>
              <Show when={meeting().fromMeetingId}>
                <div class="absolute bottom-px right-1 bg-inherit rounded">
                  <ACTION_ICONS.repeat />
                </div>
              </Show>
            </Show>
          </ButtonLike>
        );
      }}
      hoverBoundary={boundary()}
      hoverCard={() => <MeetingHoverCard meeting={blockProps.meeting} />}
    />
  );
};
