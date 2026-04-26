import {htmlAttributes} from "components/utils/html_attributes";
import {createEffect, createSignal, mergeProps, on, onCleanup, splitProps, VoidComponent} from "solid-js";
import {isDEV} from "../utils/dev_mode";
import {useResizeObserver} from "../utils/resize_observer";
import {FullLogo} from "./FullLogo";

interface Props extends htmlAttributes.div {
  readonly paused?: boolean;
  readonly speedMult?: number;
  readonly maurCountMin?: number;
  readonly maurCountMax?: number;
  readonly maurCountWavePeriodMs?: number;
  readonly maurSpeedPxPerSec?: number;
  readonly headingDriftSigma?: number;
  readonly minSpawnIntervalMs?: number;
  readonly eraserWidth?: number;
  readonly pencilWidth?: number;
  readonly eraserPasses?: number;
}

const MAX_FPS = 60;
const MAX_TICKS_INTERVAL = 1000;
// Cap for one integration sub-step in simulation seconds. With larger steps the OU damping zeroes
// out angleVel before it contributes to the angle, so paths stop curving at high speedMult.
const MAX_SUB_STEP_SIM_SEC = 0.05;

const DEV_SPEED_MULT = 1;

// Matches the pale look of Wrights blocks (which render the brand colors at low alpha on white).
const LOGO_DIMMED_OPACITY = 0.3;
// Matches Wrights' WRIGHT_COLOR.
const MAUR_COLOR = "#bbb";

const DEFAULTS = {
  speedMult: 1,
  maurCountMin: 1,
  maurCountMax: 10,
  maurCountWavePeriodMs: 60_000,
  maurSpeedPxPerSec: 70,
  headingDriftSigma: 1.4,
  minSpawnIntervalMs: 1000,
  eraserWidth: 14,
  pencilWidth: 1.5,
  eraserPasses: 5,
} as const satisfies Props;

interface Maur {
  x: number;
  y: number;
  angle: number;
  angleVel: number;
  age: number;
}

function randomGaussian() {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export const Maurtue: VoidComponent<Props> = (allProps) => {
  const [ownProps, divProps] = splitProps(allProps, [
    "paused",
    "speedMult",
    "maurCountMin",
    "maurCountMax",
    "maurCountWavePeriodMs",
    "maurSpeedPxPerSec",
    "headingDriftSigma",
    "minSpawnIntervalMs",
    "eraserWidth",
    "pencilWidth",
    "eraserPasses",
  ]);
  const props = mergeProps(DEFAULTS, ownProps);
  const resizeObserver = useResizeObserver();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  // eslint-disable-next-line solid/reactivity
  const canvasSize = resizeObserver.observeClientSize(container);

  // The mask buffer is a detached off-screen canvas owned by this component instance, and is the
  // single source of truth for the mask state. All drawing happens here. The visible canvas is
  // just a render target that the buffer is blitted to. Decoupling them means resize-time pixel
  // wipes on the visible canvas don't affect the persistent mask state.
  const maskBuffer = document.createElement("canvas");
  const maskBufferCtx = maskBuffer.getContext("2d")!;
  let maskCanvas: HTMLCanvasElement | undefined;
  let maskCtx: CanvasRenderingContext2D | undefined;
  let maurCtx: CanvasRenderingContext2D | undefined;

  const maur: Maur[] = [];
  let rt = 0;
  let prevTime = 0;
  let nextSpawnT = 0;
  let rafId: number | undefined = undefined;
  // Drives FullLogo opacity: stays invisible until the buffer is first filled, so the logo doesn't
  // briefly flash through a transparent mask on mount.
  const [maskFilled, setMaskFilled] = createSignal(false);

  function initOrResizeMask() {
    const size = canvasSize();
    if (!size) {
      return;
    }
    const [w, h] = size;
    if (w <= 0 || h <= 0) {
      return;
    }
    // Snapshot the existing buffer (persistent across visible-canvas resizes).
    let snapshot: HTMLCanvasElement | undefined;
    if (maskBuffer.width > 0 && maskBuffer.height > 0) {
      snapshot = document.createElement("canvas");
      snapshot.width = maskBuffer.width;
      snapshot.height = maskBuffer.height;
      snapshot.getContext("2d")!.drawImage(maskBuffer, 0, 0);
    }
    // Resize wipes the buffer to fully transparent.
    maskBuffer.width = w;
    maskBuffer.height = h;
    maskBufferCtx.globalCompositeOperation = "source-over";
    if (snapshot) {
      // Paste the snapshot onto the transparent buffer first so its per-pixel alpha (the carved
      // pencil lines) is preserved. If we filled white first, source-over compositing of any
      // transparent snapshot pixel would leave the underlying opaque white in place and the
      // carves would vanish.
      const ox = Math.round((w - snapshot.width) / 2);
      const oy = Math.round((h - snapshot.height) / 2);
      maskBufferCtx.drawImage(snapshot, ox, oy);
      // Fill white in the four border regions outside the pasted snapshot.
      maskBufferCtx.fillStyle = "white";
      const visTop = Math.max(0, oy);
      const visBottom = Math.min(h, oy + snapshot.height);
      const visLeft = Math.max(0, ox);
      const visRight = Math.min(w, ox + snapshot.width);
      if (visTop > 0) {
        maskBufferCtx.fillRect(0, 0, w, visTop);
      }
      if (visBottom < h) {
        maskBufferCtx.fillRect(0, visBottom, w, h - visBottom);
      }
      if (visLeft > 0) {
        maskBufferCtx.fillRect(0, visTop, visLeft, visBottom - visTop);
      }
      if (visRight < w) {
        maskBufferCtx.fillRect(visRight, visTop, w - visRight, visBottom - visTop);
      }
    } else {
      maskBufferCtx.fillStyle = "white";
      maskBufferCtx.fillRect(0, 0, w, h);
    }
    if (maskCanvas && maskCtx) {
      maskCanvas.width = w;
      maskCanvas.height = h;
      maskCtx.drawImage(maskBuffer, 0, 0);
    }
    setMaskFilled(true);
  }

  createEffect(on(canvasSize, () => initOrResizeMask()));

  function spawnMaur() {
    const size = canvasSize();
    if (!size) {
      return;
    }
    const [w, h] = size;
    const margin = 30;
    const edge = Math.floor(Math.random() * 4);
    let x: number;
    let y: number;
    let baseAngle: number;
    if (edge === 0) {
      x = Math.random() * w;
      y = -margin;
      baseAngle = Math.PI / 2;
    } else if (edge === 1) {
      x = w + margin;
      y = Math.random() * h;
      baseAngle = Math.PI;
    } else if (edge === 2) {
      x = Math.random() * w;
      y = h + margin;
      baseAngle = -Math.PI / 2;
    } else {
      x = -margin;
      y = Math.random() * h;
      baseAngle = 0;
    }
    const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.5;
    maur.push({x, y, angle, angleVel: 0, age: 0});
  }

  // Wave from min (at rt=0) up to max and back, on a cos curve so it starts at the min.
  function targetMaurCount(rtMs: number) {
    const phase = (rtMs / props.maurCountWavePeriodMs) * 2 * Math.PI;
    return Math.round(props.maurCountMin + (props.maurCountMax - props.maurCountMin) * (1 - Math.cos(phase)) * 0.5);
  }

  function tick(time: number) {
    const dTimeMs = Math.max(0, time - prevTime);
    prevTime = time;
    const speedMult = props.speedMult * (isDEV() ? DEV_SPEED_MULT : 1);
    const dt = (dTimeMs / 1000) * speedMult;
    rt += dTimeMs * speedMult;
    if (!dt) {
      return;
    }
    const size = canvasSize();
    if (!size) {
      return;
    }
    const [w, h] = size;
    if (maur.length < targetMaurCount(rt) && rt >= nextSpawnT) {
      spawnMaur();
      nextSpawnT = rt + props.minSpawnIntervalMs;
    }
    const numSubSteps = Math.max(1, Math.ceil(dt / MAX_SUB_STEP_SIM_SEC));
    const subDt = dt / numSubSteps;
    const sqrtSubDt = Math.sqrt(subDt);
    const subDamping = Math.pow(0.4, subDt);
    const useEraser = props.eraserWidth > 0 && props.eraserPasses > 0;
    for (const m of maur) {
      for (let s = 0; s < numSubSteps; s++) {
        m.angleVel += randomGaussian() * props.headingDriftSigma * sqrtSubDt;
        m.angleVel *= subDamping;
        m.angle += m.angleVel * subDt;
        const newX = m.x + Math.cos(m.angle) * props.maurSpeedPxPerSec * subDt;
        const newY = m.y + Math.sin(m.angle) * props.maurSpeedPxPerSec * subDt;
        if (useEraser) {
          // Eraser uses butt cap so it doesn't extend past the segment endpoints — otherwise
          // each step's eraser would sweep back over the previous step's pencil line and erase
          // the trail. Stroked multiple times so the AA-fringe alpha asymptotes to 1 (a single
          // source-over pass leaves ~50% alpha at the AA edges, letting old pencil lines show
          // through faintly).
          maskBufferCtx.globalCompositeOperation = "source-over";
          maskBufferCtx.strokeStyle = "white";
          maskBufferCtx.lineWidth = props.eraserWidth;
          maskBufferCtx.lineCap = "butt";
          maskBufferCtx.beginPath();
          maskBufferCtx.moveTo(m.x, m.y);
          maskBufferCtx.lineTo(newX, newY);
          for (let i = 0; i < props.eraserPasses; i++) {
            maskBufferCtx.stroke();
          }
        }
        // Pencil reveal stroke — round cap so consecutive segments connect smoothly.
        maskBufferCtx.globalCompositeOperation = "destination-out";
        maskBufferCtx.lineWidth = props.pencilWidth;
        maskBufferCtx.lineCap = "round";
        maskBufferCtx.beginPath();
        maskBufferCtx.moveTo(m.x, m.y);
        maskBufferCtx.lineTo(newX, newY);
        maskBufferCtx.stroke();
        m.x = newX;
        m.y = newY;
      }
      m.age += dt;
    }
    maskBufferCtx.globalCompositeOperation = "source-over";
    const exitMargin = 60;
    for (let i = maur.length - 1; i >= 0; i--) {
      const m = maur[i]!;
      if (m.x < -exitMargin || m.x > w + exitMargin || m.y < -exitMargin || m.y > h + exitMargin) {
        maur.splice(i, 1);
      }
    }
    // Reflect this tick's buffer changes onto the visible canvas.
    if (maskCtx && maskCanvas && maskCanvas.width === maskBuffer.width && maskCanvas.height === maskBuffer.height) {
      maskCtx.globalCompositeOperation = "copy";
      maskCtx.drawImage(maskBuffer, 0, 0);
      maskCtx.globalCompositeOperation = "source-over";
    }
  }

  function draw() {
    const size = canvasSize();
    if (!size || !maurCtx) {
      return;
    }
    const [w, h] = size;
    maurCtx.clearRect(0, 0, w, h);
    maurCtx.fillStyle = MAUR_COLOR;
    for (const m of maur) {
      maurCtx.beginPath();
      maurCtx.arc(m.x, m.y, 2, 0, Math.PI * 2, false);
      maurCtx.fill();
    }
  }

  function frame(time: DOMHighResTimeStamp) {
    rafId = undefined;
    try {
      const size = canvasSize();
      if (!size) {
        return;
      }
      if (!prevTime) {
        prevTime = time;
        return;
      }
      while (time - prevTime > MAX_TICKS_INTERVAL) {
        tick(prevTime + MAX_TICKS_INTERVAL);
      }
      if (time - prevTime < 1000 / MAX_FPS) {
        return;
      }
      tick(time);
      draw();
    } finally {
      if (!props.paused) {
        rafId = requestAnimationFrame(frame);
      }
    }
  }

  function forceFrame() {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(frame);
  }

  onCleanup(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  });

  createEffect(() => {
    if (props.paused) {
      // The frame loop simply doesn't reschedule rAF while paused; nothing else to do.
    } else {
      // Reset prevTime so the first frame post-resume initializes from the current rAF time
      // instead of computing a huge dt covering the entire pause duration (which would warp every
      // maur far in from the screen edge in its first tick).
      prevTime = 0;
      forceFrame();
    }
  });

  return (
    <div ref={setContainer} {...htmlAttributes.merge(divProps, {class: "bg-white"})}>
      <FullLogo class="absolute inset-2.5" style={{opacity: maskFilled() ? LOGO_DIMMED_OPACITY : 0}} />
      <canvas
        ref={(elem) => {
          maskCanvas = elem;
          maskCtx = elem.getContext("2d")!;
          initOrResizeMask();
        }}
        class="absolute inset-0 pointer-events-none"
      />
      <canvas
        ref={(elem) => {
          maurCtx = elem.getContext("2d")!;
          rafId = requestAnimationFrame(frame);
        }}
        class="absolute inset-0 pointer-events-none"
        width={canvasSize()?.[0]}
        height={canvasSize()?.[1]}
      />
    </div>
  );
};
