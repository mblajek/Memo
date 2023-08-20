import { cx } from "components/utils";
import { Component } from "solid-js";
import { FacilityControl, UserInfo } from "../components/header";
import s from "./style.module.scss";

export const Header: Component = () => {
  return (
    <header class={cx(s.header)}>
      <div class="flex-grow" />
      <FacilityControl />
      <UserInfo />
    </header>
  );
};
