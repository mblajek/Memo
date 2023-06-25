import cx from "classnames";
import { ParentComponent } from "solid-js";
import s from "./style.module.scss";

export const Container: ParentComponent = (props) => {
  return (
    <div
      class={cx(
        s.container,
        "min-h-screen h-screen max-h-screen p-0 m-0 bg-white overflow-hidden"
      )}
    >
      {props.children}
    </div>
  );
};