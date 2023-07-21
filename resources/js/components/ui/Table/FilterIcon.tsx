import {useLangFunc} from "components/utils";
import {FiFilter} from 'solid-icons/fi';
import {Component} from "solid-js";

interface Props {
  isFiltering?: boolean;
  class?: string;
  onClear?: () => void;
}

export const FilterIcon: Component<Props> = props => {
  const t = useLangFunc();
  return <span title={
    props.isFiltering ?
      [
        t("tables.filter.filter_set"),
        props.onClear && t("tables.filter.click_to_clear"),
      ].filter(Boolean).join("\n") :
      t("tables.filter.filter_cleared")
  }>
    <FiFilter
      class={props.class}
      classList={{"text-black": true, "text-opacity-30": !props.isFiltering}}
      onClick={props.onClear}
    />
  </span>;
};
