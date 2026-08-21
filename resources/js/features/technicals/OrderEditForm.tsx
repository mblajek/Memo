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
  // Start over whenever the underlying set changes.
  createComputed(() => setIds(originalIds()));
  const [isSaving, setIsSaving] = createSignal(false);
  const isChanged = () => ids().some((id, index) => id !== originalIds()[index]);
  // Dropped after the blink has played (or on the first move): moving a row reinserts its
  // DOM node, which would restart the animation.
  const [highlightPending, setHighlightPending] = createSignal(true);
  const highlightClass = (id: string) =>
    id === props.highlightId && highlightPending() ? "blinkBg rounded" : undefined;
  function move(id: string, delta: -1 | 1) {
    setHighlightPending(false);
    setIds((ids) => {
      const index = ids.indexOf(id);
      const otherIndex = index + delta;
      if (otherIndex < 0 || otherIndex >= ids.length) {
        return ids;
      }
      const result = [...ids];
      result[index] = result[otherIndex]!;
      result[otherIndex] = id;
      return result;
    });
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
      <div class="grid grid-cols-[auto_1fr] items-center gap-1">
        <For each={ids()}>
          {(id) => {
            const item = byId().get(id)!;
            return (
              <>
                <div class="flex">
                  <Show when={item.movable} fallback={<div />}>
                    <Button
                      class="minimal"
                      title={t("actions.move_up")}
                      disabled={ids().indexOf(id) === 0}
                      onClick={() => move(id, -1)}
                    >
                      <actionIcons.MoveUp class="inlineIcon" />
                    </Button>
                    <Button
                      class="minimal -ms-px"
                      title={t("actions.move_down")}
                      disabled={ids().indexOf(id) === ids().length - 1}
                      onClick={() => move(id, 1)}
                    >
                      <actionIcons.MoveDown class="inlineIcon" />
                    </Button>
                  </Show>
                </div>
                <div
                  class={cx("px-1", highlightClass(id))}
                  use:scrollIntoView={[id === props.highlightId, {block: "center"}]}
                  on:animationend={() => setHighlightPending(false)}
                >
                  <OrderItemRow label={item.label} details={item.details} />
                </div>
              </>
            );
          }}
        </For>
      </div>
      <div class="flex flex-col items-stretch gap-1">
        <Button class="secondary small" disabled={!isChanged() || isSaving()} onClick={() => setIds(originalIds())}>
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
