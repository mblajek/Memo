import {hoverSignal} from "components/ui/hover_signal";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {Random} from "components/utils/random";
import {Timeout} from "components/utils/timeout";
import {createSignal, VoidComponent} from "solid-js";

const _Directives = typeof hoverSignal;

export const FullLogo: VoidComponent<htmlAttributes.div> = (props) => (
  <div {...props}>
    <svg viewBox="10 0 100 30" class="w-full h-full dark:brightness-150" preserveAspectRatio="xMidYMid">
      <image x="10" y="0" width="70" height="30" href="/img/memo_logo.svg" />
      <image x="82" y="0" width="25" height="30" href="/img/cpd_children_logo.svg" />
    </svg>
  </div>
);

export const ShortLogo: VoidComponent<htmlAttributes.div> = (props) => (
  <div {...props}>
    <img class="w-full h-full" src="/img/memo_logo_short.svg" />
  </div>
);

export const CPDChildrenLogo: VoidComponent<htmlAttributes.div> = (props) => (
  <div {...props}>
    <img class="w-full h-full" src="/img/cpd_children_logo.svg" />
  </div>
);

const TIMER_PARAMS = {
  intervalSecs: [60, 10 * 60],
  durationSecs: [3, 10],
} as const;

export const ShortChangingLogo: VoidComponent<htmlAttributes.div> = (props) => {
  const [timeHover, setTimeHover] = createSignal(false);
  const timeout = new Timeout();
  function scheduleTimeHover(timeMs?: number) {
    timeout.set(
      () => {
        setTimeHover(true);
        timeout.set(
          () => {
            setTimeHover(false);
            scheduleTimeHover();
          },
          Random.RANDOM.nextInt(...TIMER_PARAMS.durationSecs) * 1000,
        );
      },
      timeMs ?? Random.RANDOM.nextInt(...TIMER_PARAMS.intervalSecs) * 1000,
    );
  }
  scheduleTimeHover(1000);
  function variantProps(active: boolean) {
    return {
      class: cx(
        "w-full h-full col-start-1 row-start-1 transition-opacity",
        timeHover() === active ? "opacity-100" : "opacity-0",
      ),
      style: {"transition-duration": "1s"},
    } satisfies htmlAttributes.div;
  }
  return (
    <div {...htmlAttributes.merge(props, {class: "grid"})} onPointerEnter={() => scheduleTimeHover(0)}>
      <CPDChildrenLogo {...variantProps(false)} />
      <ShortLogo {...variantProps(true)} />
    </div>
  );
};
