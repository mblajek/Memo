import {
  BsHouseAdd,
  BsHouseDash,
  BsHouseGear,
  BsPersonAdd,
  BsPersonBadge,
  BsPersonDash,
  BsPersonGear,
} from "solid-icons/bs";
import {IoPeopleCircleOutline, IoPersonCircleOutline} from "solid-icons/io";

// A set of reusable icons for some of the repeatable entities.

export const USER_ICONS = {
  menu: BsPersonGear,
  add: BsPersonAdd,
  remove: BsPersonDash,
};

export const STAFF_ICONS = {
  menu: BsPersonBadge,
  staffMember: BsPersonBadge,
};

export const CLIENT_ICONS = {
  menu: IoPeopleCircleOutline,
  client: IoPersonCircleOutline,
};

export const FACILITY_ICONS = {
  menu: BsHouseGear,
  add: BsHouseAdd,
  remove: BsHouseDash,
};
