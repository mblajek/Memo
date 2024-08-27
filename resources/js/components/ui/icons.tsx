import {IconTemplate, IconTypes} from "solid-icons";
import {BiRegularCopy, BiRegularPaste, BiRegularPlus, BiRegularRepeat} from "solid-icons/bi";
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
import {CgUndo} from "solid-icons/cg";
import {FiEdit2} from "solid-icons/fi";
import {ImCircleRight} from "solid-icons/im";
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";
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

export namespace clientGroupIcons {
  export const ClientGroup: IconTypes = (props) => <IoPeopleCircleOutline {...props} />;
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
  export const RepeatFirst: IconTypes = (props) => <customIcons.RepeatFirst {...props} />;
  export const RepeatLast: IconTypes = (props) => <customIcons.RepeatLast {...props} />;
  export const Copy: IconTypes = (props) => <BiRegularCopy {...props} />;
  export const Paste: IconTypes = (props) => <BiRegularPaste {...props} />;
  export const Reset: IconTypes = (props) => <CgUndo {...props} />;
}

namespace customIcons {
  export const RepeatFirst: IconTypes = (props) =>
    IconTemplate(
      {
        a: {viewBox: "0 0 24 24"},
        c: `<path d="M21 6h-5v2h4v9H4V8h5v3l5-4-5-4v3H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><rect x="3" y="13" width="5" height="5" rx="1"/>`,
      },
      props,
    );
  export const RepeatLast: IconTypes = (props) =>
    IconTemplate(
      {
        a: {viewBox: "0 0 24 24"},
        c: `<path d="M21 6h-5v2h4v9H4V8h5v3l5-4-5-4v3H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><rect x="16" y="13" width="5" height="5" rx="1"/>`,
      },
      props,
    );
}
