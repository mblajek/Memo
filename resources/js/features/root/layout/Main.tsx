import {cx} from "components/utils";
import {ParentComponent} from "solid-js";
import s from "./style.module.scss";

export const Main: ParentComponent = (props) => {
  return <main class={cx(s.main)}><div class={cx(s.mainInner)}>{props.children}</div></main>;
};
