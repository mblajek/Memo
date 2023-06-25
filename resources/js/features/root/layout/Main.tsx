import cx from "classnames";
import { ParentComponent } from "solid-js";
import s from "./style.module.scss";

export const Main: ParentComponent = (props) => {
  return <main class={cx(s.main)}>{props.children}</main>;
};
