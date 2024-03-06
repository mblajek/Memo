import * as pagination from "@zag-js/pagination";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {FaSolidArrowLeftLong, FaSolidArrowRightLong} from "solid-icons/fa";
import {IoEllipsisHorizontal} from "solid-icons/io";
import {For, Show, VoidComponent, createComputed, createMemo, createUniqueId, on} from "solid-js";
import {useTable} from ".";
import {Button} from "../Button";
import s from "./Pagination.module.scss";

export const Pagination: VoidComponent = () => {
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
      onPageChange: ({page}) => table.setPageIndex(page - 1),
    }),
  );
  const api = createMemo(() => pagination.connect(state, send, normalizeProps));
  createComputed(() => api().setCount(table.getPageCount()));
  // Update the machine when the table changes the page index for unrelated reason.
  // Use `on` to prevent updates when the value does not actually change.
  createComputed(
    on(
      () => table.getState().pagination.pageIndex,
      (pageIndex) => api().setPage(pageIndex + 1),
    ),
  );
  return (
    <Show when={api().totalPages > 1}>
      <div class={s.pagination}>
        <div {...api().rootProps}>
          <Button {...api().prevTriggerProps}>
            <FaSolidArrowLeftLong />
          </Button>
          <For each={api().pages}>
            {(page, i) => (
              <Show
                when={page.type === "page" && page}
                fallback={
                  <span {...api().getEllipsisProps({index: i()})}>
                    <IoEllipsisHorizontal />
                  </span>
                }
              >
                {(page) => <Button {...api().getItemProps(page())}>{page().value}</Button>}
              </Show>
            )}
          </For>
          <Button {...api().nextTriggerProps}>
            <FaSolidArrowRightLong />
          </Button>
        </div>
      </div>
    </Show>
  );
};
