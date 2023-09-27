import {VoidComponent} from "solid-js";
import MemoIcon from "./memo_icon.svg";

export interface MemoLoaderProps {
  size?: number;
}

/**
 * Custom loader with application's simple logo as icon
 */
export const MemoLoader: VoidComponent<MemoLoaderProps> = (props) => (
  <div class="animate-pulse">
    <MemoIcon height={props.size || 100} />
  </div>
);
