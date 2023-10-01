import {VoidComponent} from "solid-js";
import MemoIcon from "./memo_icon.svg";

/** Full screen application loader, with a pulsating Memo logo. */
export const MemoLoader: VoidComponent = () => (
  <div class="w-screen h-screen flex justify-center items-center animate-pulse">
    <MemoIcon height={300} />
  </div>
);
