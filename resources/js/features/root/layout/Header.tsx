import {FacilityControl, UserInfo} from "../components/header";
import {Component} from "solid-js";
import s from "./style.module.scss";
import {cx} from "components/utils";

export const Header: Component = () => {
  return (
    <header class={cx(s.header)}>
      <div class="flex-grow" />
      <FacilityControl />
      <UserInfo />
    </header>
  );
};
