import {SelectItem} from "components/ui/form/Select";
import {title} from "components/ui/title";
import {cx} from "components/utils/classnames";
import {JSX, Match, Show, Switch, VoidComponent} from "solid-js";

type _Directives = typeof title;

interface SelectItemSymbolProps {
  readonly symbol: string;
  readonly class?: string;
  readonly title?: string;
}

export const SelectItemSymbol: VoidComponent<SelectItemSymbolProps> = (props) => (
  <span class={cx("font-semibold line-clamp-1", props.class)} use:title={props.title}>
    {props.symbol}
  </span>
);

interface SelectItemDescriptionProps {
  readonly description: string;
  readonly class?: string;
}

export const SelectItemDescription: VoidComponent<SelectItemDescriptionProps> = (props) => (
  <span class={cx("text-sm text-grey-text", props.class)}>{props.description}</span>
);

interface SelectItemLabelProps {
  readonly value: string;
  readonly symbol?: string;
  readonly symbolClass?: string;
  readonly description?: string;
  readonly infoIcon?: JSX.Element;
}

export const SelectItemLabelOnList: VoidComponent<SelectItemLabelProps> = (props) => (
  <div class="flex items-baseline gap-1">
    <Show when={props.symbol}>{(symbol) => <SelectItemSymbol symbol={symbol()} class={props.symbolClass} />}</Show>
    <Show when={props.description} fallback={<div class="grow">&nbsp</div>}>
      {(desc) => <SelectItemDescription description={desc()} class="grow" />}
    </Show>
    {props.infoIcon}
  </div>
);

export const SelectItemLabel: VoidComponent<SelectItemLabelProps> = (props) => (
  <Switch>
    <Match when={props.symbol}>
      {(symbol) => <SelectItemSymbol symbol={symbol()} class={props.symbolClass} title={props.description} />}
    </Match>
    <Match when={props.description}>{(desc) => <SelectItemDescription description={desc()} />}</Match>
  </Switch>
);

export function makeSelectItem(opts: Partial<SelectItem> & SelectItemLabelProps) {
  return {
    text: `${opts.symbol} ${opts.description}`,
    label: () => <SelectItemLabel {...opts} />,
    labelOnList: () => <SelectItemLabelOnList {...opts} />,
    ...opts,
  } satisfies Partial<SelectItem>;
}
