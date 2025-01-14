import {useEnvInfo} from "features/system-status/env_info";
import {VoidComponent} from "solid-js";
import {FacilityControl} from "../components/header/FacilityControl";
import {UserInfo} from "../components/header/UserInfo";

export const Header: VoidComponent = () => {
  const envInfo = useEnvInfo();
  return (
    <header
      class="p-2 flex items-center gap-4 border-b border-gray-300"
      style={{"grid-area": "header", ...envInfo.style()}}
    >
      <div class="text-black">
        <FacilityControl />
      </div>
      <div class="flex-grow">{envInfo.info()}</div>
      <UserInfo />
    </header>
  );
};
