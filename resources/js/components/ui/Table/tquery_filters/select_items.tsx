import {InfoIcon, InfoIconProps} from "components/ui/InfoIcon";
import {SelectItem} from "components/ui/form/Select";
import {cx} from "components/utils";
import {Match, Show, Switch, VoidComponent} from "solid-js";

interface SelectItemSymbolProps {
  symbol: string;
  class?: string;
}

export const SelectItemSymbol: VoidComponent<SelectItemSymbolProps> = (props) => (
  <span class={cx("font-semibold", props.class)}>{props.symbol}</span>
);

interface SelectItemDescriptionProps {
  description: string;
  class?: string;
}

export const SelectItemDescription: VoidComponent<SelectItemDescriptionProps> = (props) => (
  <span class={cx("text-sm text-gray-600", props.class)}>{props.description}</span>
);

interface SelectItemLabelProps {
  symbol?: string;
  symbolClass?: string;
  description?: string;
  infoIcon?: InfoIconProps;
}

export const SelectItemLabelOnList: VoidComponent<SelectItemLabelProps> = (props) => (
  <div class="flex items-baseline gap-1">
    <Show when={props.symbol}>{(symbol) => <SelectItemSymbol symbol={symbol()} class={props.symbolClass} />}</Show>
    <Show when={props.description} fallback={<div class="grow">&nbsp</div>}>
      {(desc) => <SelectItemDescription description={desc()} class="grow" />}
    </Show>
    <Show when={props.infoIcon}>{(infoIcon) => <InfoIcon {...infoIcon()} />}</Show>
  </div>
);

export const SelectItemLabel: VoidComponent<SelectItemLabelProps> = (props) => (
  <Switch>
    <Match when={props.symbol}>{(symbol) => <SelectItemSymbol symbol={symbol()} class={props.symbolClass} />}</Match>
    <Match when={props.description}>{(desc) => <SelectItemDescription description={desc()} />}</Match>
  </Switch>
);

export function makeSelectItem(opts: Partial<SelectItem> & SelectItemLabelProps = {}) {
  return {
    value: opts.symbol || "",
    text: `${opts.symbol};${opts.description}`,
    label: () => <SelectItemLabel {...opts} />,
    labelOnList: () => <SelectItemLabelOnList {...opts} />,
    ...opts,
  } satisfies Partial<SelectItem>;
}
