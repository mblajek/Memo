import {HeaderContext} from "@tanstack/solid-table";
import {useLangFunc} from "components/utils";
import {JSX, Show, VoidComponent, createMemo} from "solid-js";
import {ColumnName, SortMarker} from ".";
import {Button} from "../Button";
import s from "./Header.module.scss";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly ctx: HeaderContext<any, unknown>;
  readonly filter?: JSX.Element;
}

/**
 * Component displaying the header of a table column. Supports sorting and resizing,
 * as well as filtering if filter element is provided.
 */
export const Header: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const resizeHandler = createMemo(() => props.ctx.header.getResizeHandler());
  return (
    <div class={s.headerCell}>
      <span class={s.title}>
        <Show when={props.ctx.column.getCanSort()} fallback={<ColumnName def={props.ctx.column.columnDef} />}>
          <Button
            class="flex items-center text-start select-text font-semibold"
            onClick={(e) => props.ctx.column.toggleSorting(undefined, e.altKey)}
            title={t("tables.sort_tooltip")}
          >
            <ColumnName def={props.ctx.column.columnDef} />
            <SortMarker column={props.ctx.column} />
          </Button>
        </Show>
      </span>
      <Show when={props.ctx.column.getCanFilter()}>{props.filter}</Show>
      <Show when={props.ctx.column.getCanResize()}>
        <div
          class={s.resizeHandler}
          classList={{[s.resizing!]: props.ctx.column.getIsResizing()}}
          onMouseDown={(e) => resizeHandler()(e)}
          onTouchStart={(e) => resizeHandler()(e)}
        />
      </Show>
    </div>
  );
};
