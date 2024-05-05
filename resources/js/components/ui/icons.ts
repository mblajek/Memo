import {BiRegularPlus, BiRegularRepeat} from "solid-icons/bi";
import {
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
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";

// A set of reusable icons for some of the repeatable entities.

export const USER_ICONS = {
  adminMenu: BsPersonGear,
  add: BsPersonAdd,
  remove: BsPersonDash,
};

export const STAFF_ICONS = {
  menu: BsPersonBadge,
  staff: BsPersonBadge,
};

export const CLIENT_ICONS = {
  menu: IoPeopleCircleOutline,
  client: IoPersonCircleOutline,
  clients: IoPeopleCircleOutline,
};

export const FACILITY_ICONS = {
  adminMenu: BsHouseGear,
  add: BsHouseAdd,
  remove: BsHouseDash,
  facility: BsHouse,
  facilities: BsHouses,
};

export const ACTION_ICONS = {
  edit: FiEdit2,
  add: BiRegularPlus,
  delete: RiSystemDeleteBin6Line,
  details: ImCircleRight,
  repeat: BiRegularRepeat,
};
