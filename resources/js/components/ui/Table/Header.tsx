import {HeaderContext} from "@tanstack/solid-table";
import {useLangFunc} from "components/utils";
import {Component, JSX, Show, createMemo} from "solid-js";
import {ColumnName, SortMarker, tableStyle as ts} from ".";
import {Button} from "../Button";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: HeaderContext<any, unknown>;
  filter?: JSX.Element;
}

/**
 * Component displaying the header of a table column. Supports sorting and resizing,
 * as well as filtering if filter element is provided.
 */
export const Header: Component<Props> = (props) => {
  const t = useLangFunc();
  const resizeHandler = createMemo(() => props.ctx.header.getResizeHandler());
  return (
    <div class={ts.headerCell}>
      <span class={ts.title}>
        <Show when={props.ctx.column.getCanSort()} fallback={<ColumnName def={props.ctx.column.columnDef} />}>
          <Button onClick={(e) => props.ctx.column.toggleSorting(undefined, e.altKey)} title={t("tables.sort_tooltip")}>
            <ColumnName def={props.ctx.column.columnDef} />
            <SortMarker column={props.ctx.column} />
          </Button>
        </Show>
      </span>
      <Show when={props.ctx.column.getCanFilter()}>{props.filter}</Show>
      <Show when={props.ctx.column.getCanResize()}>
        <div
          class={ts.resizeHandler}
          classList={{[ts.resizing!]: props.ctx.column.getIsResizing()}}
          onMouseDown={(e) => resizeHandler()(e)}
          onTouchStart={(e) => resizeHandler()(e)}
        />
      </Show>
    </div>
  );
};
