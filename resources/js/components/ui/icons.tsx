import {IconTypes} from "solid-icons";
import {BiRegularPlus, BiRegularRepeat} from "solid-icons/bi";
import {
  BsFileEarmarkPerson,
  BsHouse,
  BsHouseAdd,
  BsHouseDash,
  BsHouseGear,
  BsHouses,
  BsPersonAdd,
  BsPersonBadge,
  BsPersonDash,
  BsPersonGear,
} from "solid-icons/bs";
import {FiEdit2} from "solid-icons/fi";
import {ImCircleRight} from "solid-icons/im";
import {IoPersonCircleOutline} from "solid-icons/io";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";
import {htmlAttributes} from "../utils";

export namespace userIcons {
  export const AdminMenu: IconTypes = (props) => <BsPersonGear {...props} />;
  export const Add: IconTypes = (props) => <BsPersonAdd {...props} />;
  export const Remove: IconTypes = (props) => <BsPersonDash {...props} />;
}

export namespace staffIcons {
  export const Menu: IconTypes = (props) => <BsPersonBadge {...props} />;
  export const Staff: IconTypes = (props) => <BsPersonBadge {...props} />;
  export const StaffAndFacilityAdmin: IconTypes = (props) => <BsPersonBadge {...props} />;
}

export namespace clientIcons {
  export const Menu: IconTypes = (props) => <IoPersonCircleOutline {...props} />;
  export const Client: IconTypes = (props) => <IoPersonCircleOutline {...props} />;
}

export namespace adminIcons {
  export const Menu: IconTypes = (props) => <BsFileEarmarkPerson {...props} />;
  export const Admin: IconTypes = (props) => <BsFileEarmarkPerson {...props} />;
}

export namespace facilityIcons {
  export const AdminMenu: IconTypes = (props) => <BsHouseGear {...props} />;
  export const Add: IconTypes = (props) => <BsHouseAdd {...props} />;
  export const Remove: IconTypes = (props) => <BsHouseDash {...props} />;
  export const Facility: IconTypes = (props) => <BsHouse {...props} />;
  export const Facilities: IconTypes = (props) => <BsHouses {...props} />;
}

export namespace actionIcons {
  export const Edit: IconTypes = (props) => <FiEdit2 {...htmlAttributes.merge(props, {class: "strokeIcon"})} />;
  export const Add: IconTypes = (props) => <BiRegularPlus {...props} />;
  export const Delete: IconTypes = (props) => <RiSystemDeleteBin6Line {...props} />;
  export const Details: IconTypes = (props) => <ImCircleRight {...props} />;
  export const Repeat: IconTypes = (props) => <BiRegularRepeat {...props} />;
}
