import {VoidComponent} from "solid-js";
import {FacilityControl} from "../components/header/FacilityControl";
import {UserInfo} from "../components/header/UserInfo";
import s from "./layout.module.scss";

export const Header: VoidComponent = () => {
  return (
    <header class={s.header}>
      <FacilityControl />
      <div class="flex-grow" />
      <UserInfo />
    </header>
  );
};
