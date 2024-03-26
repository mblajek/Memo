import {Boundary} from "@floating-ui/dom";
import * as hoverCard from "@zag-js/hover-card";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx, htmlAttributes} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {JSX, Show, VoidComponent, VoidProps, createMemo, createSignal, createUniqueId} from "solid-js";
import {Dynamic, Portal} from "solid-js/web";
import s from "./HoverableMeetingEventBlock.module.scss";
import {CANCELLED_MEETING_COLORING, COMPLETED_MEETING_COLORING, Coloring} from "./colors";

export interface HoverableMeetingEventBlockProps {
  readonly meeting: TQMeetingResource;
  /** The colors of the event block, if it is a planned event. */
  readonly plannedColoring: Coloring;
  /** Whether the event block should blink initially to call the user's attention. */
  readonly blink?: boolean;
  /** Whether the hovered style should be used. If not provided, the real element hover state is used. */
  readonly hovered?: boolean;
  readonly onHoverChange?: (hovered: boolean) => void;
  readonly contents: VoidComponent<ContentsProps>;
  readonly hoverBoundary?: Boundary;
  readonly hoverCard?: () => JSX.Element;
}

interface ContentsProps extends htmlAttributes.div {
  readonly hovered: boolean;
  readonly coloring: Coloring;
}

const DISAPPEAR_MILLIS = 300;

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

  return (
    <>
      <Dynamic
        component={props.contents}
        hovered={hovered()}
        coloring={coloring()}
        class={cx("overflow-clip", props.blink ? s.blink : undefined)}
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
