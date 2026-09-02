import "components/ui/blink.css";
import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {scrollIntoView} from "components/ui/scroll_into_view";
import {SmallSpinner} from "components/ui/Spinner";
import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {createComputed, createMemo, createSignal, For, JSX, Show, VoidComponent} from "solid-js";
import {OrderItemRow} from "./order_items";

type _Directives = typeof scrollIntoView;

// A transparent 1x1 GIF, hiding the native drag ghost.
const EMPTY_DRAG_IMAGE = new Image();
EMPTY_DRAG_IMAGE.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export interface OrderEditItem {
  readonly id: string;
  readonly label: JSX.Element;
  /** Extra information about the item, displayed in a separate column. */
  readonly details?: JSX.Element;
  /** Whether the item can be moved. Immovable items are still listed, as they take up spots. */
  readonly movable: boolean;
}

interface Props {
  /** A header describing the reordered set, displayed above the list. */
  readonly header?: JSX.Element;
  /** The items, in their current order. */
  readonly items: readonly OrderEditItem[];
  /** The item initially scrolled to and briefly highlighted, e.g. the one the editor was launched from. */
  readonly highlightId?: string;
  /** Sends the new order (called only when the order actually changed). */
  readonly onConfirm: (finalIds: readonly string[]) => Promise<void>;
  readonly onCancel?: () => void;
}

/** An editor of the order of a list of items, with up/down buttons on the movable items. */
export const OrderEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  // Compare by content: the parent typically recreates the items array on every reactive
  // update, and only an actual change of the set should reset the edit state below.
  const originalIds = createMemo(() => props.items.map((item) => item.id), undefined, {
    equals: (a, b) => a.length === b.length && a.every((id, index) => id === b[index]),
  });
  const byId = createMemo(() => new Map(props.items.map((item) => [item.id, item])));
  const [ids, setIds] = createSignal<readonly string[]>([]);
  // The items ever dropped at a different spot than where their drag started, marked on the list.
  const [movedIds, setMovedIds] = createSignal<ReadonlySet<string>>(new Set());
  // Start over whenever the underlying set changes.
  createComputed(() => {
    setIds(originalIds());
    setMovedIds(new Set<string>());
  });
  const [isSaving, setIsSaving] = createSignal(false);
  const isChanged = () => ids().some((id, index) => id !== originalIds()[index]);
  // Dropped after the blink has played (or on the first move): moving a row reinserts its
  // DOM node, which would restart the animation.
  const [highlightPending, setHighlightPending] = createSignal(true);
  const highlightClass = (id: string) =>
    id === props.highlightId && highlightPending() ? "blinkBg rounded" : undefined;
  // Drag & drop: while dragging, the dragged row keeps moving to the hovered row's spot,
  // so the list always previews the resulting order. The native drag ghost (which would
  // follow the pointer sideways too) is hidden; the row moving inside the list is the only
  // visible motion, so the drag reads as purely vertical.
  const [draggedId, setDraggedId] = createSignal<string>();
  let dragStartIds: readonly string[] | undefined;
  function dragStart(e: DragEvent, id: string) {
    setHighlightPending(false);
    setDraggedId(id);
    dragStartIds = ids();
    // Firefox does not start the drag without data.
    e.dataTransfer?.setData("text/plain", "");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setDragImage(EMPTY_DRAG_IMAGE, 0, 0);
    }
  }
  function dragOver(e: DragEvent) {
    const dragged = draggedId();
    if (dragged === undefined) {
      return;
    }
    // Accept the drop anywhere on the list.
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    const overId = (e.target as Element).closest("[data-order-item]")?.getAttribute("data-order-item");
    if (!overId || overId === dragged) {
      return;
    }
    setIds((ids) => {
      const result = [...ids];
      result.splice(ids.indexOf(dragged), 1);
      result.splice(ids.indexOf(overId), 0, dragged);
      return result;
    });
  }
  function dragEnd(e: DragEvent) {
    if (e.dataTransfer?.dropEffect === "none" && dragStartIds) {
      // A cancelled drag reverts the preview. This is primarily for the Escape key, but a
      // drop outside the list is indistinguishable from it, so it cancels as well.
      setIds(dragStartIds);
    } else {
      const dragged = draggedId();
      if (dragged !== undefined && dragStartIds && ids().indexOf(dragged) !== dragStartIds.indexOf(dragged)) {
        setMovedIds((moved) => new Set(moved).add(dragged));
      }
    }
    dragStartIds = undefined;
    setDraggedId(undefined);
  }
  async function confirm() {
    setIsSaving(true);
    try {
      await props.onConfirm(ids());
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <div class="flex flex-col gap-4">
      {props.header}
      <div
        class="max-h-[60vh] overflow-y-auto"
        onDragEnter={(e) => draggedId() !== undefined && e.preventDefault()}
        onDragOver={dragOver}
        onDrop={(e) => draggedId() !== undefined && e.preventDefault()}
      >
        <div class="grid grid-cols-[auto_auto_1fr] items-center gap-0.5">
          <For each={ids()}>
            {(id) => {
              const item = byId().get(id)!;
              return (
                <div
                  class={cx(
                    "col-span-3 grid grid-cols-subgrid items-center",
                    item.movable ? "cursor-grab select-none" : undefined,
                    draggedId() === id ? "bg-select rounded" : undefined,
                  )}
                  data-order-item={id}
                  draggable={item.movable && !isSaving()}
                  onDragStart={(e) => dragStart(e, id)}
                  onDragEnd={dragEnd}
                >
                  <div class="flex items-center">
                    <Show when={item.movable}>
                      <span title={t("actions.reorder")}>
                        <actionIcons.Drag class="inlineIcon text-grey-text" />
                      </span>
                    </Show>
                  </div>
                  <div class="w-2 flex items-center justify-center">
                    <Show when={movedIds().has(id)}>
                      <div class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </Show>
                  </div>
                  <div
                    class={cx("px-1", highlightClass(id))}
                    use:scrollIntoView={[id === props.highlightId, {block: "center"}]}
                    on:animationend={() => setHighlightPending(false)}
                  >
                    <OrderItemRow label={item.label} details={item.details} />
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      <div class="flex flex-col items-stretch gap-1">
        <Button
          class="secondary small"
          disabled={!isChanged() || isSaving()}
          onClick={() => {
            setIds(originalIds());
            setMovedIds(new Set<string>());
          }}
        >
          <actionIcons.Reset class="inlineIcon" /> {t("forms.reorder.reset")}
        </Button>
        <div class="grid auto-cols-fr grid-flow-col gap-1">
          <Button class="secondary" disabled={isSaving()} onClick={() => props.onCancel?.()}>
            {t("actions.cancel")}
          </Button>
          <Button class="primary" disabled={!isChanged() || isSaving()} onClick={() => void confirm()}>
            <Show when={isSaving()}>
              <SmallSpinner />
            </Show>{" "}
            {t("actions.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};
