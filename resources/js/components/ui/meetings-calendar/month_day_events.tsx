import {ButtonLike} from "components/ui/ButtonLike";
import {cx} from "components/utils/classnames";
import {crossesDateBoundaries, formatDayMinuteHM} from "components/utils/day_minute_util";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {DateTime} from "luxon";
import {FaRegularCalendar} from "solid-icons/fa";
import {For, Match, Show, Switch, VoidComponent, createMemo, splitProps} from "solid-js";
import {RichTextView} from "../RichTextView";
import {TimeSpan} from "../calendar/types";
import {HoverableMeetingEventBlock, HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MeetingHoverCard} from "./MeetingHoverCard";
import {MeetingRepeatIcon} from "./MeetingRepeatIcon";
import {MIDNIGHT_CROSSING_SYMBOL, coloringToStyle} from "./colors";

interface Props
  extends Pick<
    HoverableMeetingEventBlockProps,
    "meeting" | "plannedColoring" | "blink" | "hovered" | "onHoverChange" | "entityId"
  > {
  readonly day: DateTime;
  readonly timeSpan: TimeSpan;
  readonly height?: number;
  readonly onClick?: () => void;
}

const DEFAULT_HEIGHT = 30;
const MAX_NUM_CLIENTS = 3;

/** Event block in a month calendar. Suitable both for all day and part day events. */
export const MonthDayMeetingEventBlock: VoidComponent<Props> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["day", "timeSpan", "height", "onClick"]);
  const t = useLangFunc();
  const {dictionaries, meetingTypeDict} = useFixedDictionaries();
  const meeting = () => blockProps.meeting;
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
                "border rounded cursor-pointer select-none relative",
                meeting()["resourceConflicts.*.resourceDictId"].length ? "!border-l-4 !border-red-600" : undefined,
              ),
              style: {
                height: `${props.height || DEFAULT_HEIGHT}px`,
                ...coloringToStyle(contentsProps.coloring, {hover: contentsProps.hovered}),
              },
            })}
            onClick={(e) => {
              if (e.button === 0) {
                e.stopPropagation();
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
                  <Switch>
                    <Match when={props.timeSpan.allDay}>
                      <FaRegularCalendar class="pt-px pb-0.5" />
                    </Match>
                    <Match when={!props.timeSpan.allDay && props.timeSpan}>
                      {(timeSpan) => (
                        <>
                          {crosses().fromPrevDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
                          {formatDayMinuteHM(timeSpan().startDayMinute)}
                          {crosses().toNextDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
                        </>
                      )}
                    </Match>
                  </Switch>
                </span>
                <Show when={dictionaries()}>
                  <For each={meeting().clients.slice(0, MAX_NUM_CLIENTS + 1)}>
                    {(client, ind) => (
                      <Show when={ind() < MAX_NUM_CLIENTS} fallback={t("ellipsis")}>
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
                    <MeetingRepeatIcon seriesData={meeting()} />
                  </div>
                </Show>
              </Show>
            </div>
          </ButtonLike>
        );
      }}
      hoverCard={(onHovered) => <MeetingHoverCard meeting={meeting()} onHovered={onHovered} />}
    />
  );
};
