import {cx} from "components/utils";
import {Component, mergeProps} from "solid-js";
import MemoIcon from "./memo_icon.svg";

export interface MemoLoaderProps {
  size?: number;
  containerClass?: string;
}

/**
 * Custom loader with application's simple logo as icon
 */
export const MemoLoader: Component<MemoLoaderProps> = (props) => {
  const merged = mergeProps({size: 100}, props);

  return (
    <div class={cx("animate-pulse", merged.containerClass)}>
      <MemoIcon height={merged.size} />
    </div>
  );
};
