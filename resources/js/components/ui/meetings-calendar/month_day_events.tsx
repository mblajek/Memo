import {ButtonLike} from "components/ui/ButtonLike";
import {ACTION_ICONS} from "components/ui/icons";
import {htmlAttributes} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {For, Show, VoidComponent, splitProps} from "solid-js";
import {HoverableMeetingEventBlock, HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MeetingHoverCard} from "./MeetingHoverCard";
import {coloringToStyle} from "./colors";
import {RichTextView} from "../RichTextView";

interface Props extends Pick<HoverableMeetingEventBlockProps, "meeting" | "plannedColoring" | "blink"> {
  readonly onClick?: () => void;
}

export const MonthDayMeetingEventBlock: VoidComponent<Props> = (allProps) => {
  const [props, blockProps] = splitProps(allProps, ["onClick"]);
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
                height: "2.3em",
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
                  <For each={meeting().clients}>
                    {(client) => (
                      <UserLink icon="tiny" type="clients" link={false} userId={client.userId} name={client.name} />
                    )}
                  </For>
                </Show>
              </div>
              <Show when={dictionaries()}>
                <div class="px-0.5">
                  <MeetingStatusTags meeting={meeting()} />
                  <Show
                    when={meeting().typeDictId !== meetingTypeDict()?.other.id}
                    fallback={<RichTextView text={meeting().notes || undefined} />}
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
