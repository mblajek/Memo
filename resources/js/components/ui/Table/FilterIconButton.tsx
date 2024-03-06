import {cx, useLangFunc} from "components/utils";
import {TbFilter, TbFilterOff} from "solid-icons/tb";
import {VoidComponent, createSignal} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";

interface Props {
  readonly class?: string;
  readonly isFiltering: boolean;
  readonly onClear: () => void;
  readonly title?: string;
}

export const FilterIconButton: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const [hover, setHover] = createSignal(false);
  return (
    <Button
      class={props.class}
      title={
        props.title ||
        (props.isFiltering
          ? `${t("tables.filter.filter_set")}\n${t("tables.filter.click_to_clear")}`
          : t("tables.filter.filter_cleared"))
      }
      disabled={!props.isFiltering}
      onMouseEnter={[setHover, true]}
      onMouseLeave={[setHover, false]}
      onClick={() => props.onClear?.()}
    >
      <Dynamic
        component={props.isFiltering && !hover() ? TbFilter : TbFilterOff}
        class={cx({dimmed: !props.isFiltering})}
      />
    </Button>
  );
};
