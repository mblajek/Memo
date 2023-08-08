import * as pagination from "@zag-js/pagination";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx} from "components/utils";
import {FaSolidArrowLeftLong, FaSolidArrowRightLong} from "solid-icons/fa";
import {IoEllipsisHorizontal} from "solid-icons/io";
import {Component, For, Show, createEffect, createMemo, createUniqueId, on} from "solid-js";
import {tableStyle as ts, useTable} from ".";
import {css} from "..";

export const Pagination: Component = () => {
  const table = useTable();
  const [state, send] = useMachine(
    pagination.machine({
      id: createUniqueId(),
      count: table.getPageCount(),
      page: table.getState().pagination.pageIndex + 1,
      // Simulate one-element pages because the pagination component wants to
      // calculate the page count itself based on the items count.
      pageSize: 1,
      siblingCount: 2,
      onChange: ({page}) => table.setPageIndex(page - 1),
    }),
  );
  const api = createMemo(() => pagination.connect(state, send, normalizeProps));
  createEffect(() => api().setCount(table.getPageCount()));
  // Update the machine when the table changes the page index for unrelated reason.
  // Use `on` to prevent updates when the value does not actually change.
  createEffect(
    on(
      () => table.getState().pagination.pageIndex,
      (pageIndex) => {
        api().setPage(pageIndex + 1);
      },
    ),
  );
  return (
    <Show when={api().totalPages > 1}>
      <div class={ts.pagination}>
        <div {...api().rootProps}>
          <button {...api().prevPageTriggerProps}>
            <FaSolidArrowLeftLong class={css.inlineIcon} />
          </button>
          <For each={api().pages}>
            {(page, i) => (
              <Show
                when={page.type === "page"}
                fallback={
                  <span {...api().getEllipsisProps({index: i()})}>
                    <IoEllipsisHorizontal class={cx(css.inlineIcon, "mb-0")} />
                  </span>
                }
              >
                {page.type === "page" && <button {...api().getPageTriggerProps(page)}>{page.value}</button>}
              </Show>
            )}
          </For>
          <button {...api().nextPageTriggerProps}>
            <FaSolidArrowRightLong class={css.inlineIcon} />
          </button>
        </div>
      </div>
    </Show>
  );
};
