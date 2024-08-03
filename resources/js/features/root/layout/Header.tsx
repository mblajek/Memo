import {useEnvInfo} from "features/system-status/env_info";
import {VoidComponent} from "solid-js";
import {FacilityControl} from "../components/header/FacilityControl";
import {UserInfo} from "../components/header/UserInfo";
import s from "./layout.module.scss";

export const Header: VoidComponent = () => {
  const envInfo = useEnvInfo();
  return (
    <header class={s.header} style={{background: envInfo.background()}}>
      <FacilityControl />
      <div class="flex-grow">{envInfo.info()}</div>
      <UserInfo />
    </header>
  );
};
