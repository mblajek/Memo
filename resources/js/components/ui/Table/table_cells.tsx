import {CellContext, HeaderContext} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, NUMBER_FORMAT, htmlAttributes, useLangFunc} from "components/utils";
import {FormattedDateTime} from "components/utils/date_formatting";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {DateTime} from "luxon";
import {Accessor, Index, JSX, ParentComponent, Show, VoidComponent} from "solid-js";
import {ChildrenOrFunc, getChildrenElement} from "../children_func";
import {EMPTY_VALUE_SYMBOL} from "../symbols";
import {Header} from "./Header";
import {IdColumn} from "./IdColumn";

export type RowDataType = Readonly<Record<string, unknown>>;

/** The component used as header in column definition. */
export type HeaderComponent<T = RowDataType> = (ctx: HeaderContext<T, unknown>) => JSX.Element;

/**
 * The component used as cell in column definition.
 *
 * Warning: It must not return a string directly, it needs to be wrapped in a JSX.Element,
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
    default: <T,>() =>
      cellFunc<unknown, T>((props) => <PaddedCell class="wrapText">{defaultFormatValue(props.v)}</PaddedCell>),
    bool: <T,>() =>
      cellFunc<boolean, T>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>{(v) => (v() ? t("bool_values.yes") : t("bool_values.no"))}</ShowCellVal>
        </PaddedCell>
      )),
    date: <T,>() =>
      cellFunc<string, T>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>
            {(v) => (
              <FormattedDateTime
                dateTime={DateTime.fromISO(v())}
                format={{...DATE_FORMAT, weekday: "short"}}
                alignWeekday
              />
            )}
          </ShowCellVal>
        </PaddedCell>
      )),
    datetime: <T,>() =>
      cellFunc<string, T>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>
            {(v) => (
              <FormattedDateTime
                dateTime={DateTime.fromISO(v())}
                format={{...DATE_TIME_FORMAT, weekday: "short"}}
                alignWeekday
              />
            )}
          </ShowCellVal>
        </PaddedCell>
      )),
    int: <T,>() =>
      cellFunc<number, T>((props) => (
        <PaddedCell class="w-full text-right">
          <ShowCellVal v={props.v}>{(v) => NUMBER_FORMAT.format(v())}</ShowCellVal>
        </PaddedCell>
      )),
    uuid: <T,>() =>
      cellFunc<string, T>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>{(v) => <IdColumn id={v()} />}</ShowCellVal>
        </PaddedCell>
      )),
    uuidList: <T,>() =>
      cellFunc<readonly string[], T>((props) => (
        <PaddedCell class="w-full flex flex-col">
          <Index each={props.v} fallback={EMPTY_VALUE_SYMBOL}>
            {(id) => <IdColumn id={id()} />}
          </Index>
        </PaddedCell>
      )),
    dict: <T,>() =>
      cellFunc<string, T>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>{(v) => dictionaries()?.getPositionById(v())?.label || "??"}</ShowCellVal>
        </PaddedCell>
      )),
    dictList: <T,>() =>
      cellFunc<readonly string[], T>((props) => (
        <PaddedCell>
          <Index each={props.v} fallback={EMPTY_VALUE_SYMBOL}>
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
    return undefined;
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

/** The cell value, with null meaning empty value and undefined meaning value that is still loading. */
type NullableCellVal<V> = V | undefined | null;

interface CellFuncProps<V, T = RowDataType> {
  readonly v: NullableCellVal<V>;
  readonly row: T;
  readonly ctx: CellContext<T, unknown>;
}

export function cellFunc<V, T = RowDataType>(CellComponent: VoidComponent<CellFuncProps<V, T>>): CellComponent<T> {
  return (ctx) => <CellComponent v={ctx.getValue() as NullableCellVal<V>} row={ctx.row.original} ctx={ctx} />;
}

interface ShowCellValProps<V> {
  readonly v: NullableCellVal<V>;
  /** The value to show when value is missing. Default: empty symbol. */
  readonly fallback?: JSX.Element;
  readonly children: ChildrenOrFunc<[Accessor<V>]>;
}

export const ShowCellVal = <V,>(props: ShowCellValProps<V>) => {
  return (
    <Show when={props.v != undefined} fallback={props.fallback ?? (props.v === null ? EMPTY_VALUE_SYMBOL : undefined)}>
      {getChildrenElement(props.children, () => props.v as V)}
    </Show>
  );
};

/** Table cell content, with padding. */
export const PaddedCell: ParentComponent<htmlAttributes.div> = (props) => (
  <div {...htmlAttributes.merge(props, {class: "w-full h-full px-1.5 py-1"})} />
);
