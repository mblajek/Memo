import * as hoverCard from "@zag-js/hover-card";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {Capitalize} from "components/ui/Capitalize";
import {bleachColor, randomColor} from "components/ui/colors";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EN_DASH} from "components/ui/symbols";
import {NON_NULLABLE, cx, htmlAttributes, useLangFunc} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {DateAndTimeInfo} from "features/meeting/DateAndTimeInfo";
import {DateTime} from "luxon";
import {
  For,
  JSX,
  ParentComponent,
  Show,
  VoidComponent,
  createMemo,
  createSignal,
  createUniqueId,
  splitProps,
} from "solid-js";
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
}

const DISAPPEAR_MILLIS = 300;

export const MeetingEventBlock: VoidComponent<MeetingEventProps> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const calendar = useColumnsCalendar();
  const tags = () => {
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
          <div class="flex flex-wrap gap-px">{tags()}</div>
          <div>{props.meeting.notes}</div>
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
                class={cx("bg-white border border-gray-400 rounded shadow p-2 flex flex-col gap-2 text-sm", {
                  "opacity-0": !hovered(),
                })}
                style={{transition: `opacity ${DISAPPEAR_MILLIS}ms ease`}}
                onMouseEnter={() => hoverApi().close()}
              >
                <DateAndTimeInfo
                  date={DateTime.fromISO(props.meeting.date)}
                  startDayMinute={props.meeting.startDayminute}
                  durationMinutes={props.meeting.durationMinutes}
                  twoLines
                />
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
                  <FieldDisp field="notes">{props.meeting.notes}</FieldDisp>
                </Show>
                <Show when={props.meeting.resources.length}>
                  <FieldDisp field="resources">{resources()}</FieldDisp>
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
