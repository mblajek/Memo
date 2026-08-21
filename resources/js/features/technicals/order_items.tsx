import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {useLangFunc} from "components/utils/lang";
import {Attribute} from "data-access/memo-api/attributes";
import {Position} from "data-access/memo-api/dictionaries";
import {JSX, ParentComponent, Show, VoidComponent} from "solid-js";

/**
 * A row representing an item on the ordering UIs (the reorder form, the "insert before"
 * selects), with the details (e.g. the item's facility) pushed to the right.
 */
interface OrderItemRowProps {
  readonly label: JSX.Element;
  readonly details?: JSX.Element;
}

export const OrderItemRow: VoidComponent<OrderItemRowProps> = (props) => (
  <div class="flex justify-between gap-2">
    <div>{props.label || <EmptyValueSymbol />}</div>
    <div class="text-grey-text">{props.details}</div>
  </div>
);

interface AttributeOrderLabelProps {
  readonly attribute: Attribute;
}

/** The label of an attribute on the ordering UIs: the name with the type appended. */
export const AttributeOrderLabel: ParentComponent<AttributeOrderLabelProps> = (props) => (
  <>
    {props.attribute.label}
    {/* No leading colon for a nameless attribute, e.g. an unnamed separator. */}
    <span class="text-grey-text">
      {props.attribute.label ? ": " : ""}
      {String(props.attribute.type)}
    </span>
    {props.children}
  </>
);

interface PositionOrderLabelProps {
  readonly position: Position;
}

/** The label of a position on the ordering UIs, greyed out and marked when disabled. */
export const PositionOrderLabel: ParentComponent<PositionOrderLabelProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class={props.position.resource.isDisabled ? "text-grey-text" : undefined}>
      {props.position.label}
      <Show when={props.position.resource.isDisabled}>
        {" "}
        {t("parenthesised", {text: t("models.position.isDisabled")})}
      </Show>
      {props.children}
    </div>
  );
};
