import {normalizeProps, useMachine} from "@zag-js/solid";
import * as tabs from "@zag-js/tabs";
import {For, JSX, VoidComponent, createMemo, createUniqueId} from "solid-js";
import {Button} from "./Button";
import s from "./Tabs.module.scss";

interface Props {
  readonly tabs: readonly Tab[];
  readonly initialActiveTab?: string;
}

interface Tab {
  readonly id: string;
  readonly label: JSX.Element;
  readonly contents: JSX.Element;
}

export const Tabs: VoidComponent<Props> = (props) => {
  // eslint-disable-next-line solid/reactivity
  const initialActiveTab = props.initialActiveTab || props.tabs[0]?.id;
  const [state, send] = useMachine(tabs.machine({id: createUniqueId(), value: initialActiveTab}));
  const api = createMemo(() => tabs.connect(state, send, normalizeProps));
  return (
    <div class={s.tabs} {...api().rootProps}>
      <div {...api().tablistProps}>
        <div class={s.triggersRow}>
          <div class={s.triggers}>
            <For each={props.tabs}>
              {(tab) => <Button {...api().getTriggerProps({value: tab.id})}>{tab.label}</Button>}
            </For>
          </div>
          <div class={s.spacer} />
        </div>
        <div {...api().indicatorProps}>
          <div class={s.indicatorLine} />
        </div>
      </div>
      <For each={props.tabs}>{(tab) => <div {...api().getContentProps({value: tab.id})}>{tab.contents}</div>}</For>
    </div>
  );
};
