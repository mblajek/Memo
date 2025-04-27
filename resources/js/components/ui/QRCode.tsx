import {Recreator} from "components/utils/Recreator";
import * as headlessQr from "headless-qr";
import {createComputed, createMemo, createSignal, Index, JSX, Show, VoidComponent} from "solid-js";

interface Props {
  readonly size: JSX.CSSProperties["width"];
  readonly content: string | undefined;
  readonly predictedContentLength?: number;
}

const SVG_VIEWBOX_SIZE = 200;
const PADDING_FRAC = 0.01;
const LOGO_SIZE_FRAC = 0.2;
const LOGO_FRAME_SIZE_FRAC = 0.25;

export const QRCode: VoidComponent<Props> = (props) => {
  const [predictedContentLength, setPredictedContentLength] = createSignal(100);
  createComputed(() => {
    if (props.content !== undefined) {
      setPredictedContentLength(props.content.length);
    } else if (props.predictedContentLength !== undefined) {
      setPredictedContentLength(props.predictedContentLength);
    }
  });
  const qrData = createMemo(() => ({
    qr: headlessQr.qr(props.content ?? "x".repeat(predictedContentLength()), {correction: "H"}),
    real: props.content !== undefined,
  }));
  return (
    <svg
      viewBox={`0 0 ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`}
      style={{width: props.size, height: props.size}}
      vector-effect="non-scaling-stroke"
    >
      <Recreator signal={qrData()}>
        {(qrData) => {
          if (!qrData) {
            return undefined;
          }
          const {qr, real} = qrData;
          const padding = SVG_VIEWBOX_SIZE * PADDING_FRAC;
          const dotSize = (SVG_VIEWBOX_SIZE * (1 - 2 * PADDING_FRAC)) / qr.length;
          const overlapMin = ((SVG_VIEWBOX_SIZE * (1 - LOGO_FRAME_SIZE_FRAC)) / 2 - padding) / dotSize;
          const overlapMax = qr.length - 1 - overlapMin;
          function overlapsLogo(index: number) {
            return index >= overlapMin && index <= overlapMax;
          }
          return (
            <>
              <defs>
                <circle id="b" r={0.53 * dotSize} fill="black" />
              </defs>
              <g
                transform={`translate(${padding + dotSize / 2}, ${padding + dotSize / 2})`}
                opacity={real ? undefined : 0.1}
              >
                <Index each={qr}>
                  {(row, y) => {
                    const yOverlapsLogo = overlapsLogo(y);
                    return (
                      <Index each={row()}>
                        {(cell, x) =>
                          yOverlapsLogo && overlapsLogo(x) ? undefined : (
                            <Show when={real ? cell() : Math.random() < 0.3}>
                              <use href="#b" x={x * dotSize} y={y * dotSize} />
                            </Show>
                          )
                        }
                      </Index>
                    );
                  }}
                </Index>
              </g>
            </>
          );
        }}
      </Recreator>
      <image
        x={(SVG_VIEWBOX_SIZE * (1 - LOGO_SIZE_FRAC)) / 2}
        y={(SVG_VIEWBOX_SIZE * (1 - LOGO_SIZE_FRAC)) / 2}
        width={SVG_VIEWBOX_SIZE * LOGO_SIZE_FRAC}
        height={SVG_VIEWBOX_SIZE * LOGO_SIZE_FRAC}
        href="/img/memo_logo_short.svg"
      />
    </svg>
  );
};
