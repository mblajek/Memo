import {actionIcons} from "components/ui/icons";
import {cx, useLangFunc} from "components/utils";
import {JSX, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";
import {createHoverSignal, hoverEvents} from "../hover_signal";

interface Props {
  readonly class?: string;
  readonly isFiltering: boolean;
  readonly onClear: () => void;
  readonly title?: JSX.Element;
}

export const FilterIconButton: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const hover = createHoverSignal();
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
      {...hoverEvents(hover)}
      onClick={() => props.onClear?.()}
    >
      <Dynamic
        component={props.isFiltering && !hover() ? actionIcons.Filter : actionIcons.FilterOff}
        class={cx({dimmed: !props.isFiltering})}
      />
    </Button>
  );
};
