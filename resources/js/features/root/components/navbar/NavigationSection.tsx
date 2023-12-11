import {AccessBarrier, AccessBarrierProps} from "components/utils";
import {For, Show, VoidComponent, splitProps} from "solid-js";
import {NavigationItem, NavigationItemProps} from "./NavigationItem";

export interface NavigationSectionProps extends Pick<AccessBarrierProps, "facilityUrl" | "roles"> {
  readonly title?: string;
  readonly items: readonly NavigationItemProps[];
}

const noop = () => null;

export const NavigationSection: VoidComponent<NavigationSectionProps> = (allProps) => {
  const [props, accessBarrierProps] = splitProps(allProps, ["items", "title"]);
  return (
    <AccessBarrier {...accessBarrierProps} Fallback={noop} Error={noop} Pending={noop}>
      <section>
        <Show when={props.title}>
          <h3 class="mb-2 py-2">{props.title}</h3>
        </Show>
        <For each={props.items}>{(item) => <NavigationItem {...item} />}</For>
      </section>
    </AccessBarrier>
  );
};
