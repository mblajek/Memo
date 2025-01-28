import {htmlAttributes} from "components/utils/html_attributes";
import {IconTemplate, IconTypes} from "solid-icons";
import {AiOutlineFileExcel} from "solid-icons/ai";
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
import {FaRegularBell, FaSolidCheck} from "solid-icons/fa";
import {FiEdit2} from "solid-icons/fi";
import {ImCircleRight} from "solid-icons/im";
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";
import {RiArrowsContractLeftRightLine, RiSystemDeleteBin6Line} from "solid-icons/ri";
import {TbFilter, TbFilterOff} from "solid-icons/tb";
import {VsSave} from "solid-icons/vs";

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
  export const ThreeDots: IconTypes = (props) =>
    IconTemplate(
      {
        a: {viewBox: "0 0 24 24"},
        c: `
    <circle cx="4" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="20" cy="12" r="3"/>`,
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
  export const Rename = CgRename;
  export const ThreeDots = customIcons.ThreeDots;
  export const FocusHorizontally = RiArrowsContractLeftRightLine;
  export const SaveTableView = VsSave;
  export const Check = FaSolidCheck;
  export const ExportCSV = AiOutlineFileExcel;
}

export namespace calendarIcons {
  export const Conflict = BiRegularCalendarX;
}

const ICON_SETS: ReadonlyMap<string, Readonly<Partial<Record<string, IconTypes>>>> = new Map<
  string,
  Readonly<Partial<Record<string, IconTypes>>>
>([
  ["userIcons", userIcons],
  ["staffIcons", staffIcons],
  ["clientIcons", clientIcons],
  ["clientGroupIcons", clientGroupIcons],
  ["adminIcons", adminIcons],
  ["facilityIcons", facilityIcons],
  ["actionIcons", actionIcons],
  ["calendarIcons", calendarIcons],
]);

export const ICON_SET_NAMES = [...ICON_SETS.keys()] as const;

export function getIconByName(iconSet: string, iconName: string): IconTypes | undefined {
  return ICON_SETS.get(iconSet)?.[iconName];
}
