import {Boundary, flip, shift} from "@floating-ui/dom";
import {cx, delayedAccessor, htmlAttributes} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {JSX, Show, VoidComponent, createComputed, createEffect, createMemo, createSignal} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Floating} from "../Floating";
import s from "./HoverableMeetingEventBlock.module.scss";
import {CANCELLED_MEETING_COLORING, COMPLETED_MEETING_COLORING, Coloring} from "./colors";

export interface HoverableMeetingEventBlockProps {
  readonly meeting: TQMeetingResource;
  /** The colors of the event block, if it is a planned event. */
  readonly plannedColoring: Coloring;
  /**
   * Whether the event should blink to call the user's attention.
   *
   * Every returned truthy value should trigger blinking, even if changed from another truthy value.
   * This is because the blinking trigger doesn't know when exactly the blinking starts,
   * because the event might still be loading from the backend.
   * So if the user triggers blinking again while the previous blinking is still in progress,
   * the new blinking should start immediately, as opposed to being ignored.
   *
   * The value `false` disables blinking immediately. Other falsy values just let the possible current
   * blinking finish.
   */
  readonly blink?: unknown | false;
  /** Whether the hovered style should be used. If not provided, the real element hover state is used. */
  readonly hovered?: boolean;
  readonly onHoverChange?: (hovered: boolean) => void;
  /** The id of the entity that produced this element. This sets the data-entity-id attribute. */
  readonly entityId?: string;
  readonly contents: VoidComponent<ContentsProps>;
  readonly hoverBoundary?: Boundary;
  readonly hoverCard?: (onHovered: () => void) => JSX.Element;
}

interface ContentsProps extends htmlAttributes.div {
  readonly hovered: boolean;
  readonly coloring: Coloring;
}

const DISAPPEAR_MILLIS = 300;

const BLINK = {
  durationIntervalMs: 460,
  count: 3,
};

export const HoverableMeetingEventBlock: VoidComponent<HoverableMeetingEventBlockProps> = (props) => {
  const {dictionaries, meetingStatusDict} = useFixedDictionaries();
  const [localHovered, setLocalHovered] = createSignal(false);
  const hovered = () => props.hovered ?? localHovered();
  function setHovered(hovered: boolean) {
    setLocalHovered(hovered);
    props.onHoverChange?.(hovered);
  }
  const coloring = createMemo(() =>
    props.meeting.statusDictId === meetingStatusDict()?.planned.id
      ? props.plannedColoring
      : props.meeting.statusDictId === meetingStatusDict()?.completed.id
        ? COMPLETED_MEETING_COLORING
        : props.meeting.statusDictId === meetingStatusDict()?.cancelled.id
          ? CANCELLED_MEETING_COLORING
          : (undefined as never),
  );
  const [isBlinking, setIsBlinking] = createSignal(false);
  let blinkTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect((prevBlink) => {
    if (props.blink && props.blink !== prevBlink) {
      setIsBlinking(false);
      clearTimeout(blinkTimer);
      setTimeout(() => {
        setIsBlinking(true);
        blinkTimer = setTimeout(() => setIsBlinking(false), BLINK.durationIntervalMs * BLINK.count);
      });
    } else if (props.blink === false) {
      setIsBlinking(false);
      clearTimeout(blinkTimer);
    }
    return props.blink;
  });
  // eslint-disable-next-line solid/reactivity
  const shouldShow = delayedAccessor(localHovered, {timeMs: 100, outputImmediately: (v) => !v});
  const [floatHovered, setFloatHovered] = createSignal(false);
  const floatVisible = delayedAccessor(shouldShow, {
    timeMs: DISAPPEAR_MILLIS,
    outputImmediately: (v) => v || floatHovered(),
  });
  createComputed(() => {
    if (!floatVisible()) {
      setFloatHovered(false);
    }
  });
  const overflowParams = createMemo(() => ({
    boundary: props.hoverBoundary || document.body,
    // Allow overflowing the top a bit, but leave a margin at the bottom.
    padding: {top: -20, bottom: 10},
  }));

  return (
    <Floating
      reference={
        <Dynamic
          component={props.contents}
          hovered={hovered()}
          coloring={coloring()}
          class={cx("overflow-clip", isBlinking() ? s.blink : undefined)}
          style={{
            "animation-duration": `${BLINK.durationIntervalMs / 2}ms`,
            "animation-iteration-count": BLINK.count * 2,
          }}
          data-entity-id={props.entityId}
          onMouseEnter={[setHovered, true]}
          onMouseLeave={[setHovered, false]}
        />
      }
      floating={(posStyle) => (
        <Show when={dictionaries() && props.hoverCard && floatVisible()}>
          <div
            class={cx("pointer-events-none z-modal overflow-clip max-w-fit", shouldShow() ? undefined : "opacity-0")}
            style={{
              transition: `opacity ${DISAPPEAR_MILLIS}ms ease`,
              ...posStyle(),
            }}
          >
            {props.hoverCard!(() => setFloatHovered(true))}
          </div>
        </Show>
      )}
      options={{
        placement: "right-start",
        middleware: [shift(overflowParams()), flip({crossAxis: false, ...overflowParams()})],
      }}
    />
  );
};
