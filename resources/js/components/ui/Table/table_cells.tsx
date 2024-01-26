import {CellContext, HeaderContext} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, NUMBER_FORMAT, htmlAttributes, useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {DateTime} from "luxon";
import {Index, JSX, ParentComponent, Show, VoidComponent} from "solid-js";
import {EMPTY_VALUE_SYMBOL} from "../symbols";
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
  const dictionaries = useDictionaries();
  return {
    defaultHeader: ((ctx) => <Header ctx={ctx} />) satisfies HeaderComponent,
    default: cellFunc((v) => <PaddedCell class="wrapText">{defaultFormatValue(v)}</PaddedCell>),
    bool: cellFunc<boolean>((v) => <PaddedCell>{v ? t("bool_values.yes") : t("bool_values.no")}</PaddedCell>),
    date: cellFunc<string>((v) => (
      <PaddedCell>
        <FormattedDateTime dateTime={DateTime.fromISO(v)} format={{...DATE_FORMAT, weekday: "short"}} alignWeekday />
      </PaddedCell>
    )),
    datetime: cellFunc<string>((v) => (
      <PaddedCell>
        <FormattedDateTime
          dateTime={DateTime.fromISO(v)}
          format={{...DATE_TIME_FORMAT, weekday: "short"}}
          alignWeekday
        />
      </PaddedCell>
    )),
    int: cellFunc<number>((v) => <PaddedCell class="w-full text-right">{NUMBER_FORMAT.format(v)}</PaddedCell>),
    uuid: cellFunc<string>((v) => (
      <PaddedCell>
        <IdColumn id={v} />
      </PaddedCell>
    )),
    uuidList: cellFunc<readonly string[]>((v) => (
      <PaddedCell class="w-full flex flex-col">
        <Index each={v}>{(id) => <IdColumn id={id()} />}</Index>
      </PaddedCell>
    )),
    dict: cellFunc<string>((v) => <PaddedCell>{dictionaries()?.getPositionById(v)?.label || "??"}</PaddedCell>),
    dictList: cellFunc<readonly string[]>((v) => (
      <PaddedCell>
        <ul>
          <Index each={v}>{(id) => <li>{dictionaries()?.getPositionById(id())?.label || "??"}</li>}</Index>
        </ul>
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

export function cellFunc<V>(
  func: <T>(v: V, ctx: CellContext<T, unknown>) => JSX.Element | undefined,
  fallback?: () => JSX.Element,
): CellComponent {
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
