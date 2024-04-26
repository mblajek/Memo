import {Boundary} from "@floating-ui/dom";
import * as hoverCard from "@zag-js/hover-card";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx, htmlAttributes} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {JSX, Show, VoidComponent, VoidProps, createEffect, createMemo, createSignal, createUniqueId} from "solid-js";
import {Dynamic, Portal} from "solid-js/web";
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
  readonly hoverCard?: () => JSX.Element;
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

  const [hoverState, hoverSend] = useMachine(
    hoverCard.machine({
      id: createUniqueId(),
      closeDelay: DISAPPEAR_MILLIS,
      positioning: {
        boundary: () => props.hoverBoundary || document.body,
        gutter: 0,
        strategy: "absolute",
        placement: "right-start",
        overflowPadding: 0,
        flip: true,
      },
    }),
    {
      context: () => ({
        // Make sure the hover is not opened initially - this causes the position to be calculated incorrectly.
        // This is a workaround for what seems to be a zag bug.
        openDelay: dictionaries() ? 100 : 2000,
      }),
    },
  );
  const hoverApi = createMemo(() => hoverCard.connect(hoverState, hoverSend, normalizeProps));
  const [hoveredGetter, hoveredSetter] = createSignal(false);
  function setHovered(hovered: boolean) {
    hoveredSetter(hovered);
    props.onHoverChange?.(hovered);
  }
  const hovered = () => props.hovered ?? hoveredGetter();
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
  createEffect(() => {
    if (props.blink) {
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
  });

  return (
    <>
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
        {...{
          ...(hoverApi().triggerProps as VoidProps<htmlAttributes.div>),
          // Remove the default touch scroll behaviour, which is to block touch scrolling.
          onTouchStart: undefined,
        }}
        onMouseEnter={[setHovered, true]}
        onMouseLeave={[setHovered, false]}
        onClick={(e: Event) => e.stopPropagation()}
      />
      <Show when={dictionaries() && hoverApi().isOpen && props.hoverCard}>
        {(hoverCard) => {
          const card = hoverCard()();
          return (
            <Portal>
              <div {...hoverApi().positionerProps} class="pointer-events-auto">
                <div
                  {...hoverApi().contentProps}
                  class={cx("z-modal overflow-clip", {"opacity-0": !hovered()})}
                  style={{transition: `opacity ${DISAPPEAR_MILLIS}ms ease`}}
                  onMouseEnter={() => hoverApi().close()}
                >
                  {card}
                </div>
              </div>
            </Portal>
          );
        }}
      </Show>
    </>
  );
};
