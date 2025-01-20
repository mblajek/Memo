import {htmlAttributes} from "components/utils/html_attributes";
import {IconTemplate, IconTypes} from "solid-icons";
import {BiRegularCalendarX, BiRegularCopy, BiRegularPaste, BiRegularPlus, BiRegularRepeat} from "solid-icons/bi";
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
import {CgRename, CgUndo} from "solid-icons/cg";
import {FaRegularBell} from "solid-icons/fa";
import {FiEdit2} from "solid-icons/fi";
import {ImCircleRight} from "solid-icons/im";
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";
import {TbFilter, TbFilterOff, TbPassword} from "solid-icons/tb";

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

export namespace userIcons {
  export const AdminMenu = BsPersonGear;
  export const Add = BsPersonAdd;
  export const Remove = BsPersonDash;
}

export namespace staffIcons {
  export const Menu = BsPersonBadge;
  export const Staff = BsPersonBadge;
  export const StaffAndFacilityAdmin = BsPersonBadge;
}

export namespace clientIcons {
  export const Menu = IoPersonCircleOutline;
  export const Client = IoPersonCircleOutline;
}

export namespace clientGroupIcons {
  export const ClientGroup = IoPeopleCircleOutline;
}

export namespace adminIcons {
  export const Menu = BsFileEarmarkPerson;
  export const Admin = BsFileEarmarkPerson;
}

export namespace facilityIcons {
  export const AdminMenu = BsHouseGear;
  export const Add = BsHouseAdd;
  export const Remove = BsHouseDash;
  export const Facility = BsHouse;
  export const Facilities = BsHouses;
}

export namespace actionIcons {
  export const Edit: IconTypes = (props) => <FiEdit2 {...htmlAttributes.merge(props, {class: "strokeIcon"})} />;
  export const Add = BiRegularPlus;
  export const Delete = RiSystemDeleteBin6Line;
  export const Details = ImCircleRight;
  export const Repeat = BiRegularRepeat;
  export const RepeatFirst = customIcons.RepeatFirst;
  export const RepeatLast = customIcons.RepeatLast;
  export const Copy = BiRegularCopy;
  export const Paste = BiRegularPaste;
  export const Reset = CgUndo;
  export const Notify = FaRegularBell;
  export const Filter: IconTypes = (props) => <TbFilter {...htmlAttributes.merge(props, {class: "strokeIcon"})} />;
  export const FilterOff: IconTypes = (props) => (
    <TbFilterOff {...htmlAttributes.merge(props, {class: "strokeIcon"})} />
  );
  export const ThreeDots = TbPassword;
  export const Rename = CgRename;
}

export namespace calendarIcons {
  export const Conflict = BiRegularCalendarX;
}
