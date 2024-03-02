import {htmlAttributes} from "components/utils";
import {FaSolidArrowLeftLong, FaSolidArrowRightLong} from "solid-icons/fa";
import {IoEllipsisHorizontal} from "solid-icons/io";
import {Component, For, Show, VoidComponent, createMemo} from "solid-js";
import {useTable} from ".";
import {Button} from "../Button";
import {getPaginationButtonsList} from "./pagination_buttons";

const SIBLINGS_COUNT = 2;

export const Pagination: VoidComponent = () => {
  const table = useTable();
  const numPages = () => table.getPageCount();
  const pageIndex = () => table.getState().pagination.pageIndex;
  const setPageIndex = (pageIndex: number) => table.setPageIndex(Math.min(Math.max(pageIndex, 0), numPages() - 1));
  const buttonsList = createMemo(() =>
    getPaginationButtonsList({numPages: numPages(), pageIndex: pageIndex(), numSiblings: SIBLINGS_COUNT}),
  );
  const ItemBtn: Component<htmlAttributes.button> = (props) => (
    <Button
      {...htmlAttributes.merge(props, {
        class:
          "px-1 min-w-8 border border-input-border bg-white rounded flex justify-center items-center text-black disabled:text-opacity-30 disabled:border-opacity-50",
      })}
    />
  );
  return (
    <Show when={numPages() > 1}>
      <div class="flex items-stretch gap-0.5">
        <ItemBtn class="!min-w-12" onClick={() => setPageIndex(pageIndex() - 1)} disabled={pageIndex() === 0}>
          <FaSolidArrowLeftLong class="text-current" />
        </ItemBtn>

        <For each={buttonsList()}>
          {(page) => (
            <Show
              when={page !== "..."}
              fallback={
                <ItemBtn disabled>
                  <IoEllipsisHorizontal class="text-current" />
                </ItemBtn>
              }
            >
              {(_) => {
                const pi = page as number;
                return (
                  <ItemBtn class={pi === pageIndex() ? "!bg-select" : undefined} onClick={[setPageIndex, pi]}>
                    {pi + 1}
                  </ItemBtn>
                );
              }}
            </Show>
          )}
        </For>
        <ItemBtn
          class="!min-w-12"
          onClick={() => setPageIndex(pageIndex() + 1)}
          disabled={pageIndex() === numPages() - 1}
        >
          <FaSolidArrowRightLong class="text-current" />
        </ItemBtn>
      </div>
    </Show>
  );
};
