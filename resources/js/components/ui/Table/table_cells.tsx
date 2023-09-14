import {CellContext, HeaderContext} from "@tanstack/solid-table";
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  DECIMAL0_NUMBER_FORMAT,
  DECIMAL2_NUMBER_FORMAT,
  useLangFunc,
} from "components/utils";
import {JSX, Show} from "solid-js";
import {Header} from "./Header";

/** The component used as header in column definition. */
export type HeaderComponent = <T>(ctx: HeaderContext<T, unknown>) => JSX.Element;

/**
 * The component used as cell in column definition.
 *
 * Warning: It function must not return a string directly, it needs to be wrapped in a JSX.Element,
 * e.g. `<>{someString}</>`. Otherwise the reactivity is lost and the cell will show stale data.
 * It is not possible to express this requirement in the type.
 */
export type CellComponent = <T>(ctx: CellContext<T, unknown>) => JSX.Element;

/** Returns a collection of cell functions for various data types. */
export function useTableCells() {
  const t = useLangFunc();
  return {
    defaultHeader: ((ctx) => <Header ctx={ctx} />) satisfies HeaderComponent,
    default: ((ctx) => (
      <Show when={ctx.getValue() != undefined}>{String(ctx.getValue())}</Show>
    )) satisfies CellComponent,
    decimal0: cellFunc<number>((v) => <span class="w-full text-right">{DECIMAL0_NUMBER_FORMAT.format(v)}</span>),
    decimal2: cellFunc<number>((v) => <span class="w-full text-right">{DECIMAL2_NUMBER_FORMAT.format(v)}</span>),
    bool: cellFunc<boolean>((v) => (v ? t("bool_values.yes") : t("bool_values.no"))),
    date: cellFunc<string>((v) => DATE_FORMAT.format(new Date(v))),
    datetime: cellFunc<string>((v) => DATE_TIME_FORMAT.format(new Date(v))),
  };
}

export function cellFunc<V>(func: (v: V) => JSX.Element | undefined, fallback?: () => JSX.Element): CellComponent {
  return (c) => (
    <Show when={c.getValue() != null} fallback={fallback?.()}>
      {func(c.getValue() as V)}
    </Show>
  );
}
