import {createEffect, createMemo, createSignal, on, onCleanup, splitProps, VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";
import {isDEV} from "../utils/dev_mode";
import {useResizeObserver} from "../utils/resize_observer";

interface Props extends htmlAttributes.div {
  readonly levels: number;
  readonly houseSize?: number;
  readonly paused?: boolean;
  readonly speedMult?: number;
}

const MARGINS = {
  x: 20,
  bottom: 0,
  top: 10,
} as const;

const BLOCK_H_TO_W = Math.sqrt(3) / 2;

const DEV_SPEED_MULT = 1;

const PACE = {
  alone: {b: 400, c: 500},
  carry: {b: 1000, c: 2000},
} as const;

const PAUSES = {
  afterPlace: 300,
  appear: 4000,
  disappear: 3000,
} as const;

const MAX_FPS = 30;
const MAX_TICKS_INTERVAL = 1000;

const MEMO_COLORS = ["#cdd500", "#009dc5", "#62358c", "#009f98", "#af1615"];
const COLORS_ALPHA = 0.2;

type Vec = readonly [number, number];

export const Wrights: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["levels", "houseSize", "paused", "speedMult"]);
  const resizeObserver = useResizeObserver();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  let ctx: CanvasRenderingContext2D | undefined;
  // eslint-disable-next-line solid/reactivity
  const canvasSize = resizeObserver.observeClientSize(container);
  // eslint-disable-next-line solid/reactivity
  const levels = props.levels;
  // eslint-disable-next-line solid/reactivity
  const houseSize = props.houseSize ?? 2;
  const colorsRot = Math.random();
  const colors = MEMO_COLORS.toSorted(() => Math.random() - 0.5);
  const data = createMemo(() => {
    if (!canvasSize()) {
      return undefined;
    }
    const [cw, ch] = canvasSize()!;
    if (!cw || !ch) {
      return undefined;
    }
    const blockRowsLen = 1 << levels;
    const totalHToW = 1 + (blockRowsLen - 1) * BLOCK_H_TO_W;
    const bw = Math.min((cw - 2 * MARGINS.x) / blockRowsLen, (ch - MARGINS.top - MARGINS.bottom) / totalHToW);
    const bh = bw * BLOCK_H_TO_W;
    const x0 = (cw - (blockRowsLen - 1) * bw) / 2;
    const y0 = (ch + MARGINS.top - MARGINS.bottom + bw * (totalHToW - 1)) / 2;
    return {ctx: ctx!, cw, ch, x0, y0, bw, bh};
  });
  createEffect(on(data, () => draw()));

  let rt = 0;

  let blockFillTime = 6 * 3600_000;

  type Path = readonly PathItem[];

  interface PathItem {
    readonly uPos: Vec;
    readonly type: "b" | "c" | undefined;
    readonly units: number;
  }

  interface Wright {
    readonly home: string | undefined;
    phase: "appear" | "carry" | "reserved" | "wait" | "disappear" | "absent";
    tPhaseStart: number;
    block?: BlockData;
    path?: Path;
  }

  const wrights: Wright[] = [{home: undefined, phase: "wait", tPhaseStart: 0}];

  interface BlockData {
    readonly block: string;
    readonly color: string;
    readonly uPlacePos: Vec;
    readonly path: Path;
    tTaken?: number;
    tPlaced?: number;
  }

  const createdBlocks = new Map<string, BlockData>();
  const availableBlocks: string[] = [];
  const totalNumBlocks = 3 ** levels;
  let numBlocksToReserve = totalNumBlocks - 1;
  let numPlacedBlocks = 0;

  function getBlockPath(block: string) {
    const path: PathItem[] = [{uPos: [0, 0], type: undefined, units: 0}];
    let x = 0;
    let y = 0;
    let levLen = 1 << (levels - 1);
    for (let i = 0; i < block.length; i++) {
      const c = block[i] as "a" | "b" | "c";
      if (c !== "a") {
        const travel = U_TRAVEL[c];
        x += travel[0] * levLen;
        y += travel[1] * levLen;
        path.push({uPos: [x, y], type: c, units: levLen});
      }
      levLen >>= 1;
    }
    return path;
  }

  function createAvailableBlock(block: string) {
    if (!createdBlocks.has(block)) {
      const path = getBlockPath(block);
      const uPlacePos = path.at(-1)!.uPos;
      createdBlocks.set(block, {
        block,
        path,
        uPlacePos,
        color: getBlockColor(uPlacePos),
      });
      availableBlocks.push(block);
    }
  }

  createAvailableBlock("a".repeat(levels));

  function createUnblockedBlocks(block: string) {
    if (block[levels - 1] === "a") {
      createAvailableBlock(block.slice(0, -1) + "b");
    } else if (block[levels - 1] === "b") {
      createAvailableBlock(block.slice(0, -1) + "c");
      let lastBInd = levels - 1;
      while (block[lastBInd - 1] === "b") {
        lastBInd--;
      }
      if (block[lastBInd - 1] === "a") {
        createAvailableBlock(block.slice(0, lastBInd - 1) + "b" + "a".repeat(levels - lastBInd));
      }
    } else {
      let lastCInd = levels - 1;
      while (block[lastCInd - 1] === "c") {
        lastCInd--;
      }
      if (lastCInd) {
        const otherTip =
          block.slice(0, lastCInd - 1) + (block[lastCInd - 1] === "a" ? "b" : "a") + block.slice(lastCInd);
        const otherTipState = createdBlocks.get(otherTip);
        if (otherTipState?.tTaken) {
          createAvailableBlock(block.slice(0, lastCInd - 1) + "c" + "a".repeat(levels - lastCInd));
        }
      }
    }
  }

  function reserveBlock() {
    if (numBlocksToReserve) {
      numBlocksToReserve--;
      return true;
    }
    return false;
  }

  function takeBlock() {
    if (!availableBlocks.length) {
      return undefined;
    }
    const i = Math.min(
      Math.max(
        Math.floor(availableBlocks.length * (0.5 + 0.4 * Math.sin(Date.now() * 0.0005)) + Math.random() ** 2),
        0,
      ),
      availableBlocks.length - 1,
    );
    const block = availableBlocks.splice(i, 1)[0]!;
    const bl = createdBlocks.get(block)!;
    bl.tTaken = rt;
    createUnblockedBlocks(block);
    return bl;
  }

  const U_TRAVEL = {b: [1, 0], c: [0.5, 1]} as const;

  function between(a: number, b: number, q: number) {
    return a + (b - a) * q;
  }

  function betweenV([ax, ay]: Vec, [bx, by]: Vec, q: number): Vec {
    return [between(ax, bx, q), between(ay, by, q)];
  }

  function travelPath(path: Path, time: number, pace: {b: number; c: number}) {
    for (let i = 1; i < path.length; i++) {
      const prevIt = path[i - 1]!;
      const it = path[i]!;
      const reqTime = pace[it.type!] * it.units;
      if (time > reqTime) {
        time -= reqTime;
      } else {
        return {remTime: 0, uPos: betweenV(prevIt.uPos, it.uPos, time / reqTime)};
      }
    }
    return {remTime: time, uPos: path.at(-1)!.uPos};
  }

  function travelPathReverse(path: Path, time: number, pace: {b: number; c: number}) {
    for (let i = path.length - 2; i >= 0; i--) {
      const prevIt = path[i + 1]!;
      const it = path[i]!;
      const reqTime = pace[prevIt.type!] * prevIt.units;
      if (time > reqTime) {
        time -= reqTime;
      } else {
        return {remTime: 0, uPos: betweenV(prevIt.uPos, it.uPos, time / reqTime)};
      }
    }
    return {remTime: time, uPos: path[0]!.uPos};
  }

  function getBlockColor([x, y]: Vec) {
    const levLen = 1 << (levels - 1);
    const rot = Math.atan2(y - ((2 * levLen) / 3 - 0.5), x - (levLen - 0.5)) / 2 / Math.PI + 2 + colorsRot;
    const [cd1, cd2] = colors
      .map((color, i) => ({
        percent: Math.abs(((rot - i / colors.length) % 1) - 0.5) * colors.length * 100 * COLORS_ALPHA,
        color,
      }))
      .sort((d1, d2) => d1.percent - d2.percent);
    return `color-mix(in oklab, ${cd1!.color} ${cd2!.percent}%, ${cd2!.color} ${cd1!.percent}%)`;
  }

  function placeBlock(block: BlockData, path: Path) {
    numPlacedBlocks++;
    const estBuildTime = (rt / numPlacedBlocks) * totalNumBlocks;
    if (estBuildTime < blockFillTime) {
      blockFillTime = 0.9 * blockFillTime + 0.1 * 1.1 * estBuildTime;
    }
    if (numPlacedBlocks === totalNumBlocks) {
      finishTime = prevTime + blockFillTime + 1000;
    }
    block.tPlaced = rt;
    if (block.block.endsWith("c".repeat(houseSize)) && reserveBlock()) {
      wrights.push({home: block.block, phase: "appear", tPhaseStart: rt, path});
    }
  }

  let time0 = 0;
  let prevTime = 0;
  let pausedTime = 0;
  let finishTime = 0;
  const finished = () => finishTime && prevTime >= finishTime;

  const MIN_PICKUP_INTERVAL_RANGE = [0.23 * PACE.carry.c, 1.17 * PACE.carry.c] as const;
  let minNextPickupT = 0;

  let rafId: number | undefined = undefined;

  function draw() {
    const d = data();
    if (!d) {
      return;
    }
    const {ctx, cw, ch, x0, y0, bw, bh} = d;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cw, ch);
    const WRIGHT_COLOR = "#bbb";
    const minBlockLineWidth = 1.5;
    for (const blockData of createdBlocks.values()) {
      if (blockData.tPlaced) {
        const tElapsed = rt - blockData.tPlaced;
        const outerR = bw >= 2 ? bw / 2 : 1;
        let innerR;
        ctx.strokeStyle = blockData.color;
        if (tElapsed >= blockFillTime) {
          innerR = -0.1;
        } else {
          const frac = tElapsed / blockFillTime;
          innerR = between(outerR - minBlockLineWidth, 0, frac);
        }
        ctx.strokeStyle = blockData.color;
        ctx.lineWidth = outerR - innerR;
        ctx.beginPath();
        ctx.arc(
          x0 + blockData.uPlacePos![0] * bw,
          y0 - blockData.uPlacePos![1] * bh,
          (innerR + outerR) / 2,
          0,
          Math.PI * 2,
          false,
        );
        ctx.stroke();
      }
    }
    const wrightRadius = 0.1 * bw;
    function drawWright(x: number, y: number, legLen = bw / 2) {
      ctx.strokeStyle = WRIGHT_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + legLen);
      ctx.stroke();
      ctx.fillStyle = WRIGHT_COLOR;
      ctx.beginPath();
      ctx.arc(x, y, wrightRadius, 0, Math.PI * 2, false);
      ctx.fill();
    }
    const JUMP_K = 0.5;
    const COS_LOW = -Math.cos((JUMP_K * Math.PI) / 2);
    function drawWrightAppear(x: number, y: number, frac: number) {
      const phase1Frac = 0.6;
      const phase2Frac = 0.3;
      const yt = y + (2 / 3) * ((1 << houseSize) - 1) * bh;
      if (frac < phase1Frac) {
        frac /= phase1Frac;
        ctx.strokeStyle = `rgb(from ${WRIGHT_COLOR} r g b / ${frac})`;
        ctx.lineWidth = between(0.2 * (1 << houseSize) * bw, wrightRadius, frac);
        ctx.beginPath();
        ctx.arc(x, yt, between(0.4 * (1 << houseSize) * bw, wrightRadius / 2, frac ** 0.3), 0, Math.PI * 2, false);
        ctx.stroke();
      } else {
        frac -= phase1Frac;
        if (frac < phase2Frac) {
          frac /= phase2Frac;
          const jy = between(y, yt, (Math.cos(frac * Math.PI * (1 + JUMP_K / 2)) - COS_LOW) / (1 - COS_LOW));
          drawWright(x, jy, Math.min(Math.max(y + bw / 2 - jy, 0), bw / 2));
        } else {
          drawWright(x, y);
        }
      }
    }
    function drawWrightDisappear(x: number, y: number, frac: number) {
      ctx.strokeStyle = `rgb(from ${WRIGHT_COLOR} r g b / ${(1 - frac) ** 2})`;
      ctx.lineWidth = between(wrightRadius, 2 * wrightRadius, frac);
      ctx.beginPath();
      const r = between(wrightRadius / 2, 1.5 * wrightRadius, frac ** 0.6);
      const outerR = r + ctx.lineWidth / 2;
      ctx.arc(x, y, r, 0, Math.PI * 2, false);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + outerR);
      ctx.lineTo(x, y + outerR + between(bw / 2 - outerR, 0, frac));
      ctx.stroke();
    }
    for (const wright of wrights) {
      const {block, phase, tPhaseStart, path} = wright;
      const phaseT = Math.max(0, rt - tPhaseStart);
      switch (phase) {
        case "appear": {
          const {uPos} = path!.at(-1)!;
          const x = x0 + uPos[0] * bw;
          const y = y0 - uPos[1] * bh;
          drawWrightAppear(x, y, phaseT / PAUSES.appear);
          break;
        }
        case "reserved": {
          const {uPos} = travelPathReverse(path!, phaseT, PACE.alone);
          const x = x0 + uPos[0] * bw;
          const y = y0 - uPos[1] * bh;
          drawWright(x, y);
          break;
        }
        case "wait": {
          break;
        }
        case "carry": {
          const {uPos} = travelPath(path!, phaseT, PACE.carry);
          const x = x0 + uPos[0] * bw;
          const y = y0 - uPos[1] * bh;
          ctx.fillStyle = "white";
          ctx.strokeStyle = block!.color;
          ctx.lineWidth = minBlockLineWidth;
          const outerR = bw >= 2 ? bw / 2 : 1;
          ctx.beginPath();
          ctx.arc(x, y, outerR - minBlockLineWidth / 2, 0, Math.PI * 2, false);
          ctx.fill();
          ctx.stroke();
          drawWright(x, y);
          break;
        }
        case "disappear": {
          const {uPos} = path!.at(-1)!;
          const x = x0 + uPos[0] * bw;
          const y = y0 - uPos[1] * bh;
          drawWrightDisappear(x, y, phaseT / PAUSES.disappear);
          break;
        }
        case "absent": {
          break;
        }
        default:
          return phase satisfies never;
      }
    }
  }

  function frame(time: DOMHighResTimeStamp) {
    rafId = undefined;
    try {
      const d = data();
      if (!d) {
        return;
      }
      if (!time0) {
        time0 = time;
        prevTime = time;
        return;
      }
      if (pausedTime) {
        time0 += time - pausedTime;
        pausedTime = 0;
      }
      const {x0, bw} = d;

      function stationPath(path: Path): Path {
        const stationUPosX = x0 / bw + 0.6;
        return [
          {uPos: [-stationUPosX, 0], type: undefined, units: 0},
          {uPos: [0, 0], type: "b", units: stationUPosX},
          ...path.slice(1),
        ];
      }

      function tick(time: number) {
        const dTime = time - prevTime;
        prevTime = time;
        rt += dTime * (props.speedMult ?? 1) * (isDEV() ? DEV_SPEED_MULT : 1);
        for (const wright of wrights) {
          const {phase, tPhaseStart, block, path} = wright;
          const phaseT = Math.max(0, rt - tPhaseStart);
          switch (phase) {
            case "appear": {
              if (phaseT > PAUSES.appear) {
                wright.phase = "reserved";
                wright.tPhaseStart += PAUSES.appear;
              }
              break;
            }
            case "reserved": {
              const {remTime} = travelPathReverse(path!, phaseT, PACE.alone);
              if (remTime) {
                wright.phase = "wait";
                wright.tPhaseStart = rt - remTime;
              }
              break;
            }
            case "wait": {
              if (rt >= minNextPickupT) {
                const block = takeBlock();
                if (block) {
                  wright.phase = "carry";
                  wright.block = block;
                  wright.tPhaseStart = rt;
                  wright.path = stationPath(block.path);
                  minNextPickupT =
                    rt +
                    Math.random() * (MIN_PICKUP_INTERVAL_RANGE[1] - MIN_PICKUP_INTERVAL_RANGE[0]) +
                    MIN_PICKUP_INTERVAL_RANGE[0];
                }
              }
              break;
            }
            case "carry": {
              const {remTime} = travelPath(path!, phaseT, PACE.carry);
              if (remTime) {
                placeBlock(block!, path!);
                if (reserveBlock()) {
                  wright.phase = "reserved";
                } else {
                  wright.phase = "disappear";
                }
                wright.tPhaseStart = rt + PAUSES.afterPlace - remTime;
              }
              break;
            }
            case "disappear": {
              if (phaseT > PAUSES.disappear) {
                wright.phase = "absent";
                wright.tPhaseStart += PAUSES.disappear;
              }
              break;
            }
            case "absent": {
              break;
            }
            default:
              return phase satisfies never;
          }
        }
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
      if (!props.paused && !finished()) {
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
      pausedTime ||= prevTime;
    } else if (!finished()) {
      forceFrame();
    }
  });

  return (
    <div ref={setContainer} {...divProps}>
      <canvas
        ref={(elem) => {
          ctx = elem.getContext("2d")!;
          rafId = requestAnimationFrame(frame);
        }}
        width={canvasSize()?.[0]}
        height={canvasSize()?.[1]}
      />
    </div>
  );
};
