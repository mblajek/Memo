import {ParentComponent, Show} from "solid-js";

interface Props {
  readonly title?: string;
}

export const NavigationSection: ParentComponent<Props> = (props) => (
  <section class="flex flex-col gap-1">
    <Show when={props.title}>
      <h3 class="pt-2 font-medium">{props.title}</h3>
    </Show>
    {props.children}
  </section>
);
