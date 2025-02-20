import {ColumnSizingInfoState, HeaderContext} from "@tanstack/solid-table";
import {ColumnName} from "components/ui/Table/ColumnName";
import {FilterIconButton} from "components/ui/Table/FilterIconButton";
import {SortMarker} from "components/ui/Table/SortMarker";
import {cx} from "components/utils/classnames";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {BsArrowsCollapse} from "solid-icons/bs";
import {JSX, Show, Signal, VoidComponent, createEffect, createMemo, on} from "solid-js";
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

  const thisColSizingInfo = createMemo(() => {
    const sizingInfo = props.ctx.table.getState().columnSizingInfo;
    return sizingInfo.isResizingColumn === props.ctx.column.id ? sizingInfo : undefined;
  });
  function isCollapsing(sizing: ColumnSizingInfoState | undefined) {
    return (
      props.ctx.column.getCanHide() &&
      !!sizing?.startSize &&
      !!sizing.deltaOffset &&
      sizing.startSize + sizing.deltaOffset < 10
    );
  }
  const collapsing = () => isCollapsing(thisColSizingInfo());
  createEffect(
    on(thisColSizingInfo, (sizingInfo, prevSizingInfo) => {
      if (!sizingInfo && isCollapsing(prevSizingInfo)) {
        props.ctx.column.toggleVisibility(false);
        // eslint-disable-next-line solid/reactivity
        props.ctx.table.setColumnSizing((old) =>
          prevSizingInfo?.startSize ? {...old, [props.ctx.column.id]: prevSizingInfo.startSize} : old,
        );
      }
    }),
  );

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
            "absolute top-0 right-0 h-full w-[5px] select-none touch-none",
            props.ctx.column.getIsResizing()
              ? "cursor-col-resize bg-memo-active"
              : props.ctx.table.getState().columnSizingInfo.isResizingColumn
                ? undefined
                : "cursor-col-resize hover:bg-gray-400",
            collapsing() ? "bg-red-400" : "",
          )}
          onPointerDown={(e) => resizeHandler()(e)}
        >
          <Show when={collapsing()}>
            <BsArrowsCollapse size="30" class="rotate-90 absolute top-2 right-2 text-red-400 bg-white rounded-lg" />
          </Show>
        </div>
      </Show>
    </div>
  );
};
