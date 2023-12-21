import {bleachColor, randomColor} from "components/ui/colors";
import {CLIENT_ICONS} from "components/ui/icons";
import {EN_DASH} from "components/ui/symbols";
import {NON_NULLABLE, htmlAttributes, useLangFunc} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {For, JSX, ParentComponent, Show, VoidComponent, createMemo, splitProps} from "solid-js";

// Note: The implementation of the event blocks is not final. It will depend a lot on the event model
// which is not yet finalised. It should also display a larger version of the event block on hover.

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
  readonly style?: JSX.CSSProperties;
}

export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const tags = createMemo(() => {
    const tags = [];
    tags.push(
      <Tag color={randomColor({uuidSeed: props.meeting.statusDictId, whiteness: 10, blackness: 30})}>
        {dictionaries()?.positionById(props.meeting.statusDictId).label}
      </Tag>,
    );
    if (props.meeting.isRemote) {
      tags.push(<Tag color="blue">{t("models.meeting.isRemote")}</Tag>);
    }
    return tags;
  });
  return (
    <div
      class="w-full h-full border rounded px-0.5 overflow-clip flex flex-col items-stretch cursor-pointer"
      style={props.style}
    >
      <div class="whitespace-nowrap font-weight-medium">
        {formatDayMinuteHM(props.meeting.startDayminute)}
        {EN_DASH}
        {formatDayMinuteHM(props.meeting.startDayminute + props.meeting.durationMinutes)}
      </div>
      <hr class="border-inherit" />
      <Show when={dictionaries()}>
        <Show when={props.meeting.clients.length}>
          <div>
            <For each={props.meeting.clients}>
              {(client) => (
                // Allow wrapping the client name, but not just after the icon.
                <div style={{"white-space": "nowrap"}}>
                  <CLIENT_ICONS.client size="16" class="inline mb-px shrink-0" />
                  <span style={{"white-space": "initial"}}>{client.name}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
        <div>{dictionaries()?.positionById(props.meeting.typeDictId).label}</div>
        <div class="flex flex-wrap gap-px">{tags()}</div>
        <div>{props.meeting.notes}</div>
        <Show when={props.meeting.resources.length}>
          <div>
            {t("parenthesised", {
              text: props.meeting.resources
                .map((r) => dictionaries()?.positionById(r.resourceDictId).label)
                .filter(NON_NULLABLE)
                .join(", "),
            })}
          </div>
        </Show>
      </Show>
    </div>
  );
};

interface TagProps extends htmlAttributes.div {
  readonly color: string;
}

export const Tag: ParentComponent<TagProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["color"]);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "border py-0.5 px-1 inline-block",
        style: {
          "color": props.color,
          "border-color": props.color,
          "border-radius": "0.7rem",
          "background-color": bleachColor(props.color, {amount: 0.8}),
        },
      })}
    />
  );
};
