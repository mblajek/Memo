import {CellContext, HeaderContext} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, NUMBER_FORMAT, htmlAttributes, useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {DateTime} from "luxon";
import {Index, JSX, ParentComponent, Show, VoidComponent} from "solid-js";
import {EMPTY_VALUE_SYMBOL} from "../symbols";
import {Header} from "./Header";
import {IdColumn} from "./IdColumn";

export type RowDataType = Readonly<Record<string, unknown>>;

/** The component used as header in column definition. */
export type HeaderComponent<T = RowDataType> = (ctx: HeaderContext<T, unknown>) => JSX.Element;

/**
 * The component used as cell in column definition.
 *
 * Warning: It function must not return a string directly, it needs to be wrapped in a JSX.Element,
 * e.g. `<>{someString}</>`. Otherwise the reactivity is lost and the cell will show stale data.
 * It is not possible to express this requirement in the type.
 */
export type CellComponent<T = RowDataType> = (ctx: CellContext<T, unknown>) => JSX.Element;

/** Returns a collection of cell functions for various data types. */
export function useTableCells() {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  return {
    defaultHeader: <T,>() => ((ctx) => <Header ctx={ctx} />) satisfies HeaderComponent<T>,
    default: <T,>() => cellFunc<unknown, T>((v) => <PaddedCell class="wrapText">{defaultFormatValue(v)}</PaddedCell>),
    bool: <T,>() =>
      cellFunc<boolean, T>((v) => <PaddedCell>{v ? t("bool_values.yes") : t("bool_values.no")}</PaddedCell>),
    date: <T,>() =>
      cellFunc<string, T>((v) => (
        <PaddedCell>
          <FormattedDateTime dateTime={DateTime.fromISO(v)} format={{...DATE_FORMAT, weekday: "short"}} alignWeekday />
        </PaddedCell>
      )),
    datetime: <T,>() =>
      cellFunc<string, T>((v) => (
        <PaddedCell>
          <FormattedDateTime
            dateTime={DateTime.fromISO(v)}
            format={{...DATE_TIME_FORMAT, weekday: "short"}}
            alignWeekday
          />
        </PaddedCell>
      )),
    int: <T,>() =>
      cellFunc<number, T>((v) => <PaddedCell class="w-full text-right">{NUMBER_FORMAT.format(v)}</PaddedCell>),
    uuid: <T,>() =>
      cellFunc<string, T>((v) => (
        <PaddedCell>
          <IdColumn id={v} />
        </PaddedCell>
      )),
    uuidList: <T,>() =>
      cellFunc<readonly string[], T>((v) => (
        <PaddedCell class="w-full flex flex-col">
          <Index each={v}>{(id) => <IdColumn id={id()} />}</Index>
        </PaddedCell>
      )),
    dict: <T,>() =>
      cellFunc<string, T>((v) => <PaddedCell>{dictionaries()?.getPositionById(v)?.label || "??"}</PaddedCell>),
    dictList: <T,>() =>
      cellFunc<readonly string[], T>((v) => (
        <PaddedCell>
          <Index each={v}>
            {(id, index) => (
              <>
                <Show when={index}>
                  <span class="text-grey-text">, </span>
                </Show>
                {dictionaries()?.getPositionById(id())?.label || "??"}
              </>
            )}
          </Index>
        </PaddedCell>
      )),
  };
}

function defaultFormatValue(value: unknown) {
  if (value == undefined) {
    return "";
  } else if (Array.isArray(value)) {
    return (
      <ul>
        <Index each={value}>{(item) => <li>{defaultFormatValue(item())}</li>}</Index>
      </ul>
    );
  } else if (typeof value === "object") {
    return JSON.stringify(value);
  } else {
    return String(value);
  }
}

export function cellFunc<V, T = RowDataType>(
  func: (v: V, ctx: CellContext<T, unknown>) => JSX.Element | undefined,
  fallback?: () => JSX.Element,
): CellComponent<T> {
  return (ctx) => (
    <Show when={ctx.getValue() != null} fallback={fallback?.()}>
      {func(ctx.getValue() as V, ctx)}
    </Show>
  );
}

/** Table cell content, with padding. */
export const PaddedCell: ParentComponent<htmlAttributes.div> = (props) => (
  <div {...htmlAttributes.merge(props, {class: "w-full h-full px-1.5 py-1"})} />
);

export const EmptyValueCell: VoidComponent = () => <PaddedCell>{EMPTY_VALUE_SYMBOL}</PaddedCell>;
