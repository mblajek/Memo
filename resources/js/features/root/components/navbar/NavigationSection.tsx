import {ParentComponent, Show} from "solid-js";

interface Props {
  readonly name?: string;
}

export const NavigationSection: ParentComponent<Props> = (props) => (
  <section class="flex flex-col gap-1">
    <Show when={props.name}>
      <h3 class="pt-2 font-medium">{props.name}</h3>
    </Show>
    {props.children}
  </section>
);
