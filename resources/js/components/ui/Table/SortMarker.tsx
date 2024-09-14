import {Column, SortDirection} from "@tanstack/solid-table";
import {useLangFunc} from "components/utils";
import {IconTypes} from "solid-icons";
import {FaSolidArrowDownLong, FaSolidArrowsUpDown, FaSolidArrowUpLong} from "solid-icons/fa";
import {Match, Switch, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {title} from "../title";
import {useTable} from "./TableContext";

const _DIRECTIVES_ = () => title;

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly column: Column<any>;
}

const ICONS = new Map<false | SortDirection, IconTypes>()
  .set(false, FaSolidArrowsUpDown)
  .set("asc", FaSolidArrowUpLong)
  .set("desc", FaSolidArrowDownLong);

export const SortMarker: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const isSecondarySort = () =>
    props.column.getIsSorted() &&
    // It is a secondary sort if there is another visible column before this one in the sort state.
    table
      .getState()
      .sorting.some(
        ({id}, index) => index < props.column.getSortIndex() && table.getState().columnVisibility[id] !== false,
      );
  const groupingInfo = () => table.options.meta?.tquery?.columnGroupingInfo?.(props.column.id);
  return (
    <Switch>
      <Match when={groupingInfo()?.isGrouped}>
        <span class="px-0.5 text-memo-active" use:title={t("tables.column_groups.column_status.grouped")}>
          {t("tables.column_groups.grouping_symbol")}
        </span>
      </Match>
      <Match when={props.column.getCanSort()}>
        <div use:title={t("tables.sort_tooltip")}>
          <Dynamic
            component={ICONS.get(props.column.getIsSorted())}
            class="inlineIcon"
            classList={{dimmed: !props.column.getIsSorted()}}
            style={{scale: isSecondarySort() ? 0.6 : undefined}}
          />
        </div>
      </Match>
    </Switch>
  );
};
