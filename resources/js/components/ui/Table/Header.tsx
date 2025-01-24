import {HeaderContext} from "@tanstack/solid-table";
import {ColumnName} from "components/ui/Table/ColumnName";
import {FilterIconButton} from "components/ui/Table/FilterIconButton";
import {SortMarker} from "components/ui/Table/SortMarker";
import {cx} from "components/utils/classnames";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {JSX, Show, Signal, VoidComponent, createMemo} from "solid-js";
import {Button} from "../Button";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly ctx: HeaderContext<any, unknown>;
  readonly wrapIn?: (header: JSX.Element) => JSX.Element;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly filter?: Signal<any | undefined>;
  readonly filterControl?: () => JSX.Element;
}

/**
 * Component displaying the header of a table column. Supports sorting and resizing,
 * as well as filtering if filter element is provided.
 */
export const Header: VoidComponent<Props> = (props) => {
  const featureSecondarySort = featureUseTrackers.tableSecondarySort();
  const resizeHandler = createMemo(() => props.ctx.header.getResizeHandler());

  const ColNameAndIcon: VoidComponent = () => (
    <div class="flex items-center">
      <ColumnName def={props.ctx.column.columnDef} />
      <SortMarker column={props.ctx.column} />
    </div>
  );

  const header = (
    <div class="font-bold">
      <Show when={props.ctx.column.getCanSort()} fallback={<ColNameAndIcon />}>
        <Button
          class="text-start select-text"
          onClick={(e) => {
            props.ctx.column.toggleSorting(undefined, e.altKey);
            if (e.altKey) {
              featureSecondarySort.justUsed();
            }
          }}
        >
          <ColNameAndIcon />
        </Button>
      </Show>
    </div>
  );

  return (
    <div
      class="h-full w-full flex flex-col items-stretch gap-0.5 justify-between overflow-clip px-1.5 py-1 relative"
      data-header-for-column={props.ctx.column.id}
    >
      {props.wrapIn ? props.wrapIn(header) : header}
      <Show when={props.ctx.column.getCanFilter() && props.filter && props.filterControl}>
        {(filterControl) => (
          <div class="flex items-stretch min-h-0 gap-0.5">
            <div class="flex-grow basis-0 overflow-y-auto">{filterControl()()}</div>
            <FilterIconButton
              class="self-end mb-1"
              isFiltering={!!props.filter![0]()}
              onClear={() => props.filter![1](undefined)}
            />
          </div>
        )}
      </Show>
      <Show when={props.ctx.column.getCanResize()}>
        <div
          on:touchstart={{handleEvent: (e) => resizeHandler()(e), passive: true}}
          class={cx(
            "absolute top-0 right-0 h-full cursor-col-resize w-[5px] select-none touch-none",
            props.ctx.column.getIsResizing() ? "bg-memo-active" : "hover:bg-gray-400",
          )}
          onPointerDown={(e) => resizeHandler()(e)}
        />
      </Show>
    </div>
  );
};
