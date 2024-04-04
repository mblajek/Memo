import {JSX, ParentComponent} from "solid-js";
import {cx, htmlAttributes} from "../utils";
import s from "./SimpleMenu.module.scss";

export interface MenuItem {
  readonly label: JSX.Element;
  readonly onClick: htmlAttributes.button["onClick"];
  readonly disabled?: boolean;
}

export const SimpleMenu: ParentComponent<htmlAttributes.div> = (props) => (
  <div {...htmlAttributes.merge(props, {class: cx(s.simpleMenu, "flex flex-col items-stretch")})} />
);
