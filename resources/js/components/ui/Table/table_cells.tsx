import {CellContext, HeaderContext} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, NUMBER_FORMAT, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {JSX, Show} from "solid-js";
import {Header} from "./Header";
import {IdColumn} from "./IdColumn";

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
    default: cellFunc((v) => <div class="wrapText">{String(v)}</div>),
    bool: cellFunc<boolean>((v) => (v ? t("bool_values.yes") : t("bool_values.no"))),
    date: cellFunc<string>((v) => DateTime.fromISO(v).toLocaleString(DATE_FORMAT)),
    datetime: cellFunc<string>((v) => DateTime.fromISO(v).toLocaleString(DATE_TIME_FORMAT)),
    int: cellFunc<number>((v) => <span class="w-full text-right">{NUMBER_FORMAT.format(v)}</span>),
    uuid: cellFunc<string>((v) => <IdColumn id={v} />),
  };
}

export function cellFunc<V>(func: (v: V) => JSX.Element | undefined, fallback?: () => JSX.Element): CellComponent {
  return (c) => (
    <Show when={c.getValue() != null} fallback={fallback?.()}>
      {func(c.getValue() as V)}
    </Show>
  );
}
