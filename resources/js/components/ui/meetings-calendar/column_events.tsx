import {ButtonLike} from "components/ui/ButtonLike";
import {RichTextView} from "components/ui/RichTextView";
import {bleachColor} from "components/ui/colors";
import {ACTION_ICONS} from "components/ui/icons";
import {EN_DASH} from "components/ui/symbols";
import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, formatDayMinuteHM} from "components/utils/day_minute_util";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {DateTime} from "luxon";
import {For, ParentComponent, Show, VoidComponent, splitProps} from "solid-js";
import {useColumnsCalendar} from "../calendar/ColumnsCalendar";
import {HoverableMeetingEventBlock, HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MeetingHoverCard} from "./MeetingHoverCard";
import {coloringToStyle} from "./colors";
import {AttendantListItem} from "./meeting_details";

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

interface MeetingEventProps
  extends Pick<HoverableMeetingEventBlockProps, "meeting" | "plannedColoring" | "blink" | "hovered" | "onHoverChange"> {
  readonly day: DateTime;
  readonly onClick?: () => void;
}

export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["day", "onClick"]);
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
  return (
    <HoverableMeetingEventBlock
      {...blockProps}
      contents={(allContentsProps) => {
        const [contentsProps, divProps] = splitProps(allContentsProps, ["hovered", "coloring"]);
        const Separator: VoidComponent = () => (
          <hr class="-mx-1 -mb-px" style={coloringToStyle(contentsProps.coloring, {part: "separator"})} />
        );
        return (
          <ButtonLike
            {...htmlAttributes.merge(divProps, {
              class: cx(
                "w-full h-full border rounded flex flex-col items-stretch cursor-pointer select-none",
                meeting().startDayminute + meeting().durationMinutes > MAX_DAY_MINUTE
                  ? DateTime.fromISO(meeting().date).day === props.day.day
                    ? "border-b-0 rounded-b-none"
                    : "border-t-0 rounded-t-none"
                  : undefined,
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
              <span class="font-weight-medium">{formatDayMinuteHM(meeting().startDayminute)}</span>
              {EN_DASH}
              <span class="font-weight-medium">
                {formatDayMinuteHM((meeting().startDayminute + meeting().durationMinutes) % MAX_DAY_MINUTE)}
              </span>
            </div>
            <Show when={dictionaries()}>
              <div class="px-0.5">
                <Show when={meeting().clients.length}>
                  <ul>
                    <For each={meeting().clients}>
                      {(client) => <AttendantListItem type="clients" attendant={client} />}
                    </For>
                  </ul>
                  <Separator />
                </Show>
                <Show when={meeting().typeDictId !== meetingTypeDict()?.other.id}>
                  <div>{dictionaries()?.getPositionById(meeting().typeDictId).label}</div>
                </Show>
                <MeetingStatusTags meeting={meeting()} />
                <Show when={meeting().notes}>
                  <Separator />
                  <RichTextView
                    class={cx(
                      "overflow-y-clip !overflow-x-visible",
                      meeting().resources.length ? "max-h-20" : undefined,
                    )}
                    text={meeting().notes!}
                  />
                </Show>
                <Show when={meeting().resources.length}>
                  <Separator />
                  <div>
                    {t("parenthesised", {
                      text: meeting()
                        .resources.map((r) => dictionaries()?.getPositionById(r.resourceDictId).label)
                        // Join by comma because Intl.ListFormat doesn't seem to work very well in Polish.
                        .join(", "),
                    })}
                  </div>
                </Show>
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
