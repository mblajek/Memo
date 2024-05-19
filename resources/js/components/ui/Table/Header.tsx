import {HeaderContext} from "@tanstack/solid-table";
import {cx} from "components/utils";
import {JSX, Show, Signal, VoidComponent, createMemo} from "solid-js";
import {ColumnName, FilterIconButton, SortMarker} from ".";
import {Button} from "../Button";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly ctx: HeaderContext<any, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly filter?: Signal<any | undefined>;
  readonly filterControl?: () => JSX.Element;
}

/**
 * Component displaying the header of a table column. Supports sorting and resizing,
 * as well as filtering if filter element is provided.
 */
export const Header: VoidComponent<Props> = (props) => {
  const resizeHandler = createMemo(() => props.ctx.header.getResizeHandler());
  return (
    <div class="h-full w-full flex flex-col items-stretch gap-0.5 justify-between overflow-clip px-1.5 py-1 relative">
      <span class="font-bold">
        <Show when={props.ctx.column.getCanSort()} fallback={<ColumnName def={props.ctx.column.columnDef} />}>
          <Button
            class="flex items-center text-start select-text"
            onClick={(e) => props.ctx.column.toggleSorting(undefined, e.altKey)}
          >
            <ColumnName def={props.ctx.column.columnDef} />
            <SortMarker column={props.ctx.column} />
          </Button>
        </Show>
      </span>
      <Show when={props.ctx.column.getCanFilter() && props.filter && props.filterControl}>
        {(filterControl) => (
          <div class="flex flex-wrap items-end gap-0.5 overflow-y-auto">
            <div class="flex-grow basis-0">{filterControl()()}</div>
            <div>
              <FilterIconButton isFiltering={!!props.filter![0]()} onClear={() => props.filter![1](undefined)} />
            </div>
          </div>
        )}
      </Show>
      <Show when={props.ctx.column.getCanResize()}>
        <div
          ref={(div) => div.addEventListener("touchstart", (e) => resizeHandler()(e), {passive: true})}
          class={cx(
            "absolute top-0 right-0 h-full cursor-col-resize w-[5px] select-none touch-none",
            props.ctx.column.getIsResizing() ? "bg-memo-active" : "hover:bg-gray-400",
          )}
          onMouseDown={(e) => resizeHandler()(e)}
        />
      </Show>
    </div>
  );
};
