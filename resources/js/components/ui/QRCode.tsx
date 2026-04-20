import {shuffle} from "components/utils/object_util";
import {NoDarkTheme} from "features/root/components/theme_control";
import * as headlessQr from "headless-qr";
import {createMemo, createSignal, onCleanup, Show, VoidComponent} from "solid-js";

interface Props {
  readonly size: number;
  readonly content: string | undefined;
}

const MAX_FPS = 60;
const MAX_STEP_DT_MILLIS = 20;
const MAX_FRAME_DT_MILLIS = 200;

const ORBITING_DARKNESS = 0.4;
const BALL_RADIUS_COEFF = 0.53;
const NUM_ORBITING_BALLS = 300;

const PADDING_FRAC = 0.02;
const LOGO_SIZE_FRAC = 0.2;
const LOGO_FRAME_SIZE_FRAC = 0.25;

export const QRCode: VoidComponent<Props> = (props) => {
  const qrData = createMemo(() => (props.content ? headlessQr.qr(props.content, {correction: "Q"}) : undefined));
  const [rawMode, setRawMode] = createSignal(false);
  let context: CanvasRenderingContext2D | undefined;
  const geom = createMemo(() => {
    const outerSize = props.size;
    const padding = PADDING_FRAC * outerSize;
    const innerSize = outerSize - 2 * padding;
    const posCenter = outerSize / 2;
    const stepSize = innerSize / (qrData()?.length || 60);
    const ballRadius = BALL_RADIUS_COEFF * stepSize;
    const posZero = padding + stepSize / 2;
    const maxOrbitR = (innerSize - stepSize) / 2;
    const logoSize = LOGO_SIZE_FRAC * innerSize;
    const logoFrameSize = LOGO_FRAME_SIZE_FRAC * innerSize;
    const minOrbitR = (1.1 * logoFrameSize) / 2;
    const logoOverlapMinInd = (innerSize - logoFrameSize) / 2 / stepSize;
    const logoOverlapMaxInd = qrData() ? qrData()!.length - 1 - logoOverlapMinInd : 0;
    return {
      outerSize,
      padding,
      innerSize,
      posCenter,
      stepSize,
      ballRadius,
      posZero,
      orbit: {
        maxR: maxOrbitR,
        minR: minOrbitR,
      },
      logoSize,
      logoFrameSize,
      logoOverlap: {
        minInd: logoOverlapMinInd,
        maxInd: logoOverlapMaxInd,
      },
    };
  });
  let rafId: number | undefined = undefined;
  onCleanup(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
  });

  interface DynValue {
    value: number;
    target: number;
    vel: number;
    spring: number;
    visc: number;
  }

  function tickVal(v: DynValue, dt: number) {
    v.vel = (v.vel + (v.target - v.value) * v.spring * dt) * (1 - v.visc);
    v.value += v.vel * dt;
  }

  interface Ball {
    x: DynValue;
    y: DynValue;
    orbit: {
      rFrac: number;
      angle: number;
      angleVel: number;
    };
    numTrackers: number;
  }

  const ballRadiusV: DynValue = {
    value: 0,
    target: 0,
    vel: 0,
    spring: 0.00003,
    visc: 0.15,
  };
  const ballDarknessV: DynValue = {
    value: 0,
    target: ORBITING_DARKNESS,
    vel: 0,
    spring: 0.0003,
    visc: 0.4,
  };
  const balls: Ball[] = [];
  const destroyedBalls = new Set<{ball: Ball; target: Ball}>();

  let prevTime: DOMHighResTimeStamp | undefined;
  let prevQR: ReturnType<typeof qrData> | undefined;
  let first = true;
  function frame(time: DOMHighResTimeStamp) {
    try {
      const qr = qrData();
      const g = geom();
      const ctx = context!;
      if (qr && rawMode()) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, g.outerSize, g.outerSize);
        ctx.fillStyle = "black";
        for (let y = 0; y < qr.length; y++) {
          const row = qr[y]!;
          for (let x = 0; x < row.length; x++) {
            if (row[x]) {
              ctx.fillRect(g.padding + x * g.stepSize, g.padding + y * g.stepSize, g.stepSize + 0.4, g.stepSize + 0.4);
            }
          }
        }
        return;
      }
      if (prevTime === undefined) {
        prevTime = time;
        prevQR = qr;
        return;
      }
      let dt = time - prevTime;
      if (dt < 1000 / MAX_FPS) {
        return;
      }
      if (dt > MAX_FRAME_DT_MILLIS) {
        dt = MAX_FRAME_DT_MILLIS;
      }
      prevTime = time;
      const prQR = prevQR!;
      prevQR = qr;

      function randomOrbitRFrac(base?: Ball) {
        const randR = Math.random() * (g.orbit.maxR - g.orbit.minR) + g.orbit.minR;
        if (base) {
          const baseFrac = 0.8;
          const baseR = Math.max(Math.abs(base.x.value - g.posCenter), Math.abs(base.y.value - g.posCenter));
          return (
            Math.min(Math.max(baseFrac * baseR + (1 - baseFrac) * randR, g.orbit.minR), g.orbit.maxR) / g.orbit.maxR
          );
        } else {
          return randR / g.orbit.maxR;
        }
      }

      function makeRandomOrbit(base?: Ball): Ball["orbit"] {
        const orbitRFrac = randomOrbitRFrac(base);
        return {
          rFrac: orbitRFrac,
          angle: base
            ? Math.atan2(base.y.value - g.posCenter, base.x.value - g.posCenter) +
              Math.random() * 0.2 +
              base.orbit.angleVel * 1000
            : Math.random() * 2 * Math.PI,
          angleVel: 0.0002 * orbitRFrac ** -1.5,
        };
      }

      function makeRandomBall(base?: Ball): Ball {
        const comp = (): DynValue => ({
          value: g.posCenter,
          target: g.posCenter,
          vel: 0,
          spring: 0.00003,
          visc: 0.18,
        });
        return {
          x: base ? {...base.x} : comp(),
          y: base ? {...base.y} : comp(),
          orbit: makeRandomOrbit(),
          numTrackers: 0,
        };
      }

      function destroyBallAt(index: number) {
        const ball = balls.splice(index, 1)[0]!;
        let minDist = Number.POSITIVE_INFINITY;
        let closestBall: Ball | undefined = undefined;
        for (const b of balls) {
          const dist = Math.abs(b.x.value - ball.x.value) + Math.abs(b.y.value - ball.y.value);
          if (dist < minDist) {
            minDist = dist;
            closestBall = b;
          }
        }
        if (closestBall) {
          closestBall.numTrackers++;
          destroyedBalls.add({ball, target: closestBall});
        }
      }

      if (qr !== prQR || first) {
        if (qr) {
          const desiredDots: (readonly [number, number])[] = [];
          for (let y = 0; y < qr.length; y++) {
            const yLogoOverlap = y >= g.logoOverlap.minInd && y <= g.logoOverlap.maxInd;
            const row = qr[y]!;
            for (let x = 0; x < row.length; x++) {
              if (row[x] && !(yLogoOverlap && x >= g.logoOverlap.minInd && x <= g.logoOverlap.maxInd)) {
                desiredDots.push([x, y]);
              }
            }
          }
          const initialBallIndices = balls.map((b, i) => i);
          const ballIndices = new Set(balls.map((b, i) => i));
          shuffle(desiredDots);
          for (const [x, y] of desiredDots) {
            const xp = g.posZero + x * g.stepSize;
            const yp = g.posZero + y * g.stepSize;
            let minDist = Number.POSITIVE_INFINITY;
            let closestBallIndex = -1;
            let closestBall: Ball | undefined = undefined;
            const useExisting = ballIndices.size > 0;
            const assumedTravelMs = 1000;
            for (const ballInd of useExisting ? ballIndices : initialBallIndices) {
              const ball = balls[ballInd]!;
              const dist =
                Math.abs(ball.x.value + ball.x.vel * assumedTravelMs - xp) +
                Math.abs(ball.y.value + ball.y.vel * assumedTravelMs - yp);
              if (dist < minDist) {
                minDist = dist;
                closestBallIndex = ballInd;
                closestBall = ball;
              }
            }
            ballIndices.delete(closestBallIndex);
            let ball;
            if (useExisting) {
              ball = closestBall!;
            } else {
              ball = makeRandomBall(closestBall);
              if (first) {
                ball.x.value = xp;
                ball.y.value = yp;
              }
              balls.push(ball);
            }
            ball.x.target = xp;
            ball.y.target = yp;
          }
          for (const ballIndex of [...ballIndices].sort((a, b) => b - a)) {
            destroyBallAt(ballIndex);
          }
        } else {
          if (!balls.length) {
            for (let i = 0; i < NUM_ORBITING_BALLS; i++) {
              balls.push(makeRandomBall());
            }
          } else {
            for (let i = balls.length; i < NUM_ORBITING_BALLS; i++) {
              const initialNumBalls = balls.length;
              balls.push(makeRandomBall(balls[Math.floor(Math.random() * initialNumBalls)]));
            }
            for (let i = 0; i < NUM_ORBITING_BALLS; i++) {
              const ball = balls[i]!;
              ball.orbit = makeRandomOrbit(ball);
            }
            for (let i = balls.length - 1; i >= NUM_ORBITING_BALLS; i--) {
              destroyBallAt(i);
            }
          }
        }
      }

      function tick(dt: number) {
        ballRadiusV.target = g.ballRadius;
        tickVal(ballRadiusV, dt);
        if (qr) {
          let totalDist = 0;
          for (const ball of balls) {
            totalDist += Math.abs(ball.x.value - ball.x.target) + Math.abs(ball.y.value - ball.y.target);
          }
          const avgDist = totalDist / balls.length;
          ballDarknessV.target = Math.max(ORBITING_DARKNESS, 1 - 0.1 * avgDist);
        } else {
          ballDarknessV.target = ORBITING_DARKNESS;
        }
        tickVal(ballDarknessV, dt);
        for (const ball of balls) {
          if (!qr) {
            ball.orbit.angle = (ball.orbit.angle + ball.orbit.angleVel * dt) % (Math.PI * 2);
            ball.x.target = g.posCenter + g.orbit.maxR * Math.cos(ball.orbit.angle) * ball.orbit.rFrac;
            ball.y.target = g.posCenter + g.orbit.maxR * Math.sin(ball.orbit.angle) * ball.orbit.rFrac;
          }
          tickVal(ball.x, dt);
          tickVal(ball.y, dt);
        }
        for (const dBall of [...destroyedBalls].reverse()) {
          const {ball, target} = dBall;
          ball.x.target = target.x.target;
          ball.y.target = target.y.target;
          tickVal(ball.x, dt);
          tickVal(ball.y, dt);
          const dist = Math.abs(ball.x.value - target.x.value) + Math.abs(ball.y.value - target.y.value);
          if (!ball.numTrackers && dist < 0.05) {
            target.numTrackers--;
            destroyedBalls.delete(dBall);
          }
        }
      }

      while (dt > MAX_STEP_DT_MILLIS) {
        tick(MAX_STEP_DT_MILLIS);
        dt -= MAX_STEP_DT_MILLIS;
      }
      tick(dt);

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, g.outerSize, g.outerSize);
      ctx.fillStyle = `lch(${(1 - ballDarknessV.value) * 100}% 0 0)`;
      const ballR = Math.max(0, ballRadiusV.value);
      function drawBall(ball: Ball) {
        ctx.beginPath();
        ctx.ellipse(ball.x.value, ball.y.value, ballR, ballR, 0, 0, 2 * Math.PI);
        ctx.fill();
      }
      for (const {ball} of destroyedBalls) {
        drawBall(ball);
      }
      for (const ball of balls) {
        drawBall(ball);
      }
      first = false;
    } finally {
      rafId = requestAnimationFrame(frame);
    }
  }

  return (
    <NoDarkTheme class="rounded overflow-clip grid">
      <canvas
        class="col-start-1 row-start-1"
        ref={(elem) => {
          context = elem.getContext("2d")!;
          rafId = requestAnimationFrame(frame);
        }}
        width={props.size}
        height={props.size}
        onClick={() => setRawMode((r) => !r && !!qrData())}
      />
      <Show when={!rawMode() || !qrData()}>
        <img
          class="col-start-1 row-start-1 m-auto pointer-events-none"
          style={{width: `${geom().logoSize}px`, height: `${geom().logoSize}px`}}
          src="/img/memo_logo_short.svg"
        />
      </Show>
    </NoDarkTheme>
  );
};
