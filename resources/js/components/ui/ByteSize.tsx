import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {createMemo, VoidComponent} from "solid-js";

type _Directives = typeof title;

const UNITS: [unit: string, bytesPerUnit: number][] = [
  ["bytes", 2 ** 0],
  ["kilobytes", 2 ** 10],
  ["megabytes", 2 ** 20],
  ["gigabytes", 2 ** 30],
  ["terabytes", 2 ** 40],
] as const;

interface Props {
  readonly bytes: number;
  /**
   * The minimum size in kilobytes from which it is presented in kilobytes, and not in bytes, etc.
   * Default: 1.
   */
  readonly minUnits?: number;
}

export const ByteSize: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const data = createMemo(() => {
    for (let i = UNITS.length - 1; i >= 0; i--) {
      const [unit, bytesPerUnit] = UNITS[i]!;
      const units = props.bytes / bytesPerUnit;
      if (!i || units >= (props.minUnits ?? 1)) {
        return {unit, units};
      }
    }
    throw new Error("unreachable");
  });
  return (
    <span use:title={data().unit === "bytes" ? undefined : t("byte_size.bytes", {count: props.bytes})}>
      {t(`byte_size.${data().unit}`, {count: data().units})}
    </span>
  );
};
