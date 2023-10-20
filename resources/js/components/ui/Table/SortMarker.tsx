import {Column, SortDirection} from "@tanstack/solid-table";
import {IconTypes} from "solid-icons";
import {FaSolidArrowDownLong, FaSolidArrowUpLong, FaSolidArrowsUpDown} from "solid-icons/fa";
import {Show, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {useTable} from "./TableContext";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any>;
}

const ICONS = new Map<false | SortDirection, IconTypes>()
  .set(false, FaSolidArrowsUpDown)
  .set("asc", FaSolidArrowUpLong)
  .set("desc", FaSolidArrowDownLong);

export const SortMarker: VoidComponent<Props> = (props) => {
  const table = useTable();
  const isSecondarySort = () =>
    props.column.getIsSorted() &&
    // It is a secondary sort if there is another visible column before this one in the sort state.
    table
      .getState()
      .sorting.some(
        ({id}, index) => index < props.column.getSortIndex() && table.getState().columnVisibility[id] !== false,
      );
  return (
    <Show when={props.column.getCanSort()}>
      <Dynamic
        component={ICONS.get(props.column.getIsSorted())}
        class="inlineIcon"
        classList={{dimmed: !props.column.getIsSorted()}}
        style={{scale: isSecondarySort() ? 0.6 : 1}}
      />
    </Show>
  );
};
