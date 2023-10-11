import {cx} from "components/utils";
import {ParentComponent} from "solid-js";
import s from "./layout.module.scss";

export const Container: ParentComponent = (props) => {
  return (
    <div class={cx(s.container, "min-h-screen h-screen max-h-screen p-0 m-0 bg-white overflow-hidden")}>
      {props.children}
    </div>
  );
};
