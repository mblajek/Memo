import {VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";

export const FullLogo: VoidComponent<htmlAttributes.div> = (props) => (
  <div {...props}>
    <svg viewBox="10 0 100 30" class="w-full h-full dark:brightness-150" preserveAspectRatio="xMidYMid">
      <image x="10" y="0" width="70" height="30" href="/img/memo_logo.svg" />
      <image x="82" y="0" width="25" height="30" href="/img/cpd_children_logo.svg" />
    </svg>
  </div>
);
