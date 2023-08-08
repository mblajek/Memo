import * as popover from "@zag-js/popover";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {useLangFunc} from "components/utils";
import {Component, For, createMemo, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {tableStyle as ts, useTable} from ".";
import {Button} from "../Button";

export const TableColumnVisibilityController: Component = () => {
  const t = useLangFunc();
  const table = useTable();
  const [state, send] = useMachine(
    popover.machine({
      portalled: true,
      positioning: {
        offset: {mainAxis: -1},
        strategy: "absolute",
        placement: "bottom-end",
      },
      id: createUniqueId(),
    }),
  );
  const api = createMemo(() => popover.connect(state, send, normalizeProps));
  return (
    <div class={ts.columnVisibility}>
      <Button {...api().triggerProps} disabled={!table.getAllLeafColumns().length}>
        {t("tables.choose_columns")}
      </Button>
      <Portal>
        <div {...api().positionerProps}>
          <div {...api().contentProps}>
            <div class="bg-white border border-gray-700 rounded px-2 flex flex-col">
              <For each={table.getAllLeafColumns()}>
                {(column) => (
                  <label>
                    <input
                      name={`column_visibility_${column.id}`}
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      type="checkbox"
                    />{" "}
                    {t(`tables.headers.${column.id}`)}
                  </label>
                )}
              </For>
            </div>
          </div>
        </div>
      </Portal>
    </div>
  );
};
