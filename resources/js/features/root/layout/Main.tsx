import {cx} from "components/utils";
import {ParentComponent} from "solid-js";
import s from "./layout.module.scss";

export const Main: ParentComponent = (props) => {
  return <main class={cx(s.main)}>{props.children}</main>;
};
