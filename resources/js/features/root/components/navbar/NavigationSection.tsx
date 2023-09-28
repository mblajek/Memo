import {AccessBarrier, AccessBarrierProps} from "components/utils";
import {Component, For, Show, splitProps} from "solid-js";
import {NavigationItem, NavigationItemProps} from "./NavigationItem";

export interface NavigationSectionProps extends Pick<AccessBarrierProps, "facilityUrl" | "roles"> {
  title?: string;
  items: NavigationItemProps[];
}

const noop = () => null;

export const NavigationSection: Component<NavigationSectionProps> = (props) => {
  const [localProps, accessBarrierProps] = splitProps(props, ["items", "title"]);
  return (
    <AccessBarrier {...accessBarrierProps} Fallback={noop} Error={noop} Pending={noop}>
      <section>
        <Show when={localProps.title}>
          <h3 class="mb-2 py-2">{localProps.title}</h3>
        </Show>
        <For each={localProps.items}>{(item) => <NavigationItem {...item} />}</For>
      </section>
    </AccessBarrier>
  );
};
