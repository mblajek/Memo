import {Column, SortDirection} from "@tanstack/solid-table";
import {IconTypes} from "solid-icons";
import {FaSolidArrowDownLong, FaSolidArrowUpLong, FaSolidArrowsUpDown} from 'solid-icons/fa';
import {Component, Show} from "solid-js";
import {Dynamic} from "solid-js/web";
import {css} from "..";

interface Props {
  column: Column<any>;
}

const ICONS = new Map<false | SortDirection, IconTypes>()
  .set(false, FaSolidArrowsUpDown)
  .set("asc", FaSolidArrowUpLong)
  .set("desc", FaSolidArrowDownLong);

export const SortMarker: Component<Props> = props => {
  return <Show when={props.column.getCanSort()}>
    <Dynamic
      component={ICONS.get(props.column.getIsSorted())}
      class={css.inlineIcon}
      classList={{"text-black": true, "text-opacity-30": !props.column.getIsSorted()}}
      fill="currentColor"
      style={{scale: props.column.getSortIndex() > 0 ? 0.6 : 1}}
    />
  </Show>;
};
