import {useLangFunc} from "components/utils";
import {TbFilter, TbFilterOff} from "solid-icons/tb";
import {Component, createSignal} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";

interface Props {
  isFiltering?: boolean;
  class?: string;
  onClear?: () => void;
}

export const FilterIcon: Component<Props> = (props) => {
  const t = useLangFunc();
  const [hover, setHover] = createSignal(false);
  return (
    <Button
      title={
        props.isFiltering
          ? [t("tables.filter.filter_set"), props.onClear && t("tables.filter.click_to_clear")]
              .filter(Boolean)
              .join("\n")
          : t("tables.filter.filter_cleared")
      }
      classList={{"cursor-pointer": props.isFiltering}}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => props.onClear?.()}
    >
      <Dynamic
        component={props.isFiltering && !hover() ? TbFilter : TbFilterOff}
        class={props.class}
        classList={{dimmed: !props.isFiltering}}
      />
    </Button>
  );
};
