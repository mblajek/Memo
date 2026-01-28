import {htmlAttributes} from "components/utils/html_attributes";
import {IconProps, IconTemplate, IconTree, IconTypes} from "solid-icons";
import {AiOutlineFileExcel, AiOutlineSearch} from "solid-icons/ai";
import {
  BiRegularCalendarX,
  BiRegularCopy,
  BiRegularDuplicate,
  BiRegularPaste,
  BiRegularPlus,
  BiRegularRepeat,
} from "solid-icons/bi";
import {
  BsCalendar3,
  BsDatabase,
  BsDatabaseAdd,
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
import {FaSolidCheck} from "solid-icons/fa";
import {FiBell, FiBellOff, FiColumns, FiEdit2} from "solid-icons/fi";
import {ImCircleRight, ImInfo} from "solid-icons/im";
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";
import {RiArrowsContractLeftRightLine, RiSystemDeleteBin6Line} from "solid-icons/ri";
import {TbOutlineFilter, TbOutlineFilterOff, TbOutlineLockCheck, TbOutlineReload} from "solid-icons/tb";
import {JSX, mergeProps} from "solid-js";

function createCustomIcon(attributes: JSX.SVGElementTags["svg"], contents: string): IconTypes {
  const src: IconTree = {a: attributes, c: contents};
  return (props: IconProps) => {
    // Workaround for a strange requirement that props is of type IconBaseProps.
    const iconBaseProps = mergeProps({src}, props);
    return IconTemplate(src, iconBaseProps);
  };
}

namespace customIcons {
  export const RepeatFirst = createCustomIcon(
    {viewBox: "0 0 24 24"},
    `<path d="M21 6h-5v2h4v9H4V8h5v3l5-4-5-4v3H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><rect x="3" y="13" width="5" height="5" rx="1"/>`,
  );
  export const RepeatLast = createCustomIcon(
    {viewBox: "0 0 24 24"},
    `<path d="M21 6h-5v2h4v9H4V8h5v3l5-4-5-4v3H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><rect x="16" y="13" width="5" height="5" rx="1"/>`,
  );
  export const ThreeDots = createCustomIcon(
    {viewBox: "0 0 24 24"},
    `<circle cx="4" cy="12" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="20" cy="12" r="3"/>`,
  );
  export const Save =
    // Copy of the old VsSave.
    createCustomIcon(
      {viewBox: "0 0 16 16"},
      `<path fill-rule="evenodd" d="m13.353 1.146 1.5 1.5L15 3v11.5l-.5.5h-13l-.5-.5v-13l.5-.5H13l.353.146zM2 2v12h12V3.208L12.793 2H11v4H4V2H2zm6 0v3h2V2H8z" clip-rule="evenodd"/>`,
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
  export const Notify = FiBell;
  export const NotifyOff = FiBellOff;
  export const Filter: IconTypes = (props) => (
    <TbOutlineFilter {...htmlAttributes.merge(props, {class: "strokeIcon"})} />
  );
  export const FilterOff: IconTypes = (props) => (
    <TbOutlineFilterOff {...htmlAttributes.merge(props, {class: "strokeIcon"})} />
  );
  export const Rename = CgRename;
  export const ThreeDots = customIcons.ThreeDots;
  export const FocusHorizontally = RiArrowsContractLeftRightLine;
  export const SaveTableView = customIcons.Save;
  export const Check = FaSolidCheck;
  export const ExportCSV = AiOutlineFileExcel;
  export const Search = AiOutlineSearch;
  export const Columns: IconTypes = (props) => <FiColumns {...htmlAttributes.merge(props, {class: "strokeIcon"})} />;
  export const Reload = TbOutlineReload;
  export const Duplicate = BiRegularDuplicate;
  export const Info = ImInfo;
  export const OTPConfigured = TbOutlineLockCheck;
  export const DB = BsDatabase;
  export const DBDump = BsDatabaseAdd;
}

export namespace calendarIcons {
  export const Calendar = BsCalendar3;
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
