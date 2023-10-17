import {VoidComponent} from "solid-js";
import {FacilityControl, UserInfo} from "../components/header";
import {HeaderSeparator} from "./HeaderSeparator";
import s from "./layout.module.scss";

export const Header: VoidComponent = () => {
  return (
    <header class={s.header}>
      <div class="flex-grow" />
      <FacilityControl />
      <HeaderSeparator />
      <UserInfo />
    </header>
  );
};
