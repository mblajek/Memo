import * as hoverCard from "@zag-js/hover-card";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {Capitalize} from "components/ui/Capitalize";
import {RichTextView} from "components/ui/RichTextView";
import {SimpleTag, Tag, TagsLine} from "components/ui/Tag";
import {bleachColor} from "components/ui/colors";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EN_DASH} from "components/ui/symbols";
import {NON_NULLABLE, cx, useLangFunc} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {MeetingDateAndTimeInfo} from "features/meeting/DateAndTimeInfo";
import {For, JSX, ParentComponent, Show, VoidComponent, createMemo, createSignal, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {useColumnsCalendar} from "../ColumnsCalendar";

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
  readonly hoverStyle?: JSX.CSSProperties;
  readonly onClick?: () => void;
}

const DISAPPEAR_MILLIS = 300;

export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const calendar = useColumnsCalendar();
  const tags = () => {
    const tags: JSX.Element[] = [];
    tags.push(
      <SimpleTag
        text={dictionaries()!.positionById(props.meeting.statusDictId).label}
        colorSeed={props.meeting.statusDictId}
      />,
    );
    if (props.meeting.isRemote) {
      tags.push(<Tag color="blue">{t("models.meeting.isRemote")}</Tag>);
    }
    return tags;
  };
  const resources = () =>
    props.meeting.resources
      .map((r) => dictionaries()?.positionById(r.resourceDictId).label)
      .filter(NON_NULLABLE)
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
      openDelay: 100,
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
  );
  const hoverApi = createMemo(() => hoverCard.connect(hoverState, hoverSend, normalizeProps));
  const [hovered, setHovered] = createSignal(false);
  return (
    <>
      <div
        class="w-full h-full border rounded px-0.5 overflow-clip flex flex-col items-stretch cursor-pointer"
        style={{...props.style, ...(hovered() ? props.hoverStyle : undefined)}}
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
          <TagsLine>{tags()}</TagsLine>
          <RichTextView text={props.meeting.notes} />
          <Show when={props.meeting.resources.length}>
            <div>{t("parenthesised", {text: resources()})}</div>
          </Show>
        </Show>
      </div>
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
                <div>{dictionaries()?.positionById(props.meeting.typeDictId).label}</div>
                <Show when={props.meeting.staff.length}>
                  <ul>
                    <For each={props.meeting.staff}>
                      {(staff) => (
                        <li>
                          <STAFF_ICONS.staff size="20" class="inline mb-px shrink-0 mr-1" />
                          <span>{staff.name}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={props.meeting.clients.length}>
                  <ul>
                    <For each={props.meeting.clients}>
                      {(client) => (
                        <li>
                          <CLIENT_ICONS.client size="20" class="inline mb-px shrink-0 mr-1" />
                          <span>{client.name}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <div class="flex flex-wrap gap-px">{tags()}</div>
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

interface FieldLabelProps {
  readonly field: string;
}

const FieldDisp: ParentComponent<FieldLabelProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col">
      <div class="font-medium">
        <Capitalize text={t("with_colon", {text: t(`models.meeting.${props.field}`)})} />
      </div>
      <div>{props.children}</div>
    </div>
  );
};
