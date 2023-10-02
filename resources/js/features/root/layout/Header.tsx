import {VoidComponent} from "solid-js";
import {FacilityControl, UserInfo} from "../components/header";
import s from "./style.module.scss";

export const Header: VoidComponent = () => {
  return (
    <header class={s.header}>
      <div class="flex-grow" />
      <FacilityControl />
      <UserInfo />
    </header>
  );
};
