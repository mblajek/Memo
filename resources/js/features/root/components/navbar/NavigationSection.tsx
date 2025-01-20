import {cx} from "components/utils/classnames";
import {useNavbarContext} from "features/root/layout/Navbar";
import {ParentComponent, Show} from "solid-js";

interface Props {
  readonly name?: string;
  readonly compact?: boolean;
}

export const NavigationSection: ParentComponent<Props> = (props) => {
  const {
    collapsed: [collapsed],
  } = useNavbarContext();
  return (
    <section class={cx("flex flex-col", props.compact ? undefined : "gap-1")}>
      <Show when={props.name}>
        <Show when={collapsed()} fallback={<h3 class="pt-2 font-medium">{props.name}</h3>}>
          <hr class="border-gray-300" />
        </Show>
      </Show>
      {props.children}
    </section>
  );
};
