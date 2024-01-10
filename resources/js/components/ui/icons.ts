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
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";

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
