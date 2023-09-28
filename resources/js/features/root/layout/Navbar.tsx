import {createQuery} from "@tanstack/solid-query";
import {cx} from "components/utils";
import {System} from "data-access/memo-api";
import {
  HiOutlineBuildingOffice,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineTableCells,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineQuestionMarkCircle,
  HiOutlineVideoCamera,
} from "solid-icons/hi";
import {Component, Show, createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {NavigationItemProps, NavigationSection} from "../components/navbar";
import s from "./style.module.scss";
import {FullLogo} from "components/ui";

export const Navbar: Component = () => {
  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions());

  const facilityUrl = () => facilitiesQuery.data?.find((facility) => facility.id === activeFacilityId())?.url;

  const sectionItems = createMemo(() => getSectionItems(facilityUrl()));

  return (
    <aside class={cx(s.sidebar)}>
      <div class={cx("py-4 px-8 bg-inherit")}>
        <FullLogo />
      </div>
      <nav class={cx("flex-1 px-8 py-4 overflow-y-auto", s.navScroll)}>
        <Show when={facilityUrl()}>
          <NavigationSection facilityUrl={facilityUrl()} roles={["verified"]} items={sectionItems().verified} />
        </Show>
        <NavigationSection items={sectionItems().unauthorized} />
        <NavigationSection roles={["globalAdmin"]} items={sectionItems().globalAdmin} title="System" />
        <Show when={facilityUrl()}>
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityAdmin"]}
            items={sectionItems().facilityAdmin}
            title="Placówka"
          />
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityStaff"]}
            items={sectionItems().facilityStaff}
            title="Moja praca"
          />
        </Show>
      </nav>
    </aside>
  );
};

const getSectionItems = (
  facilityUrl?: string,
): {
  globalAdmin: NavigationItemProps[];
  facilityAdmin: NavigationItemProps[];
  facilityStaff: NavigationItemProps[];
  verified: NavigationItemProps[];
  unauthorized: NavigationItemProps[];
} => ({
  globalAdmin: [
    {
      icon: HiOutlineBuildingOffice,
      href: "/admin/facilities",
      children: "Placówki",
    },
    {
      icon: HiOutlineUserGroup,
      href: "/admin/users",
      children: "Użytkownicy",
    },
  ],
  facilityAdmin: !facilityUrl
    ? []
    : [
        {
          icon: HiOutlineCalendarDays,
          href: `/${facilityUrl}/admin/calendar`,
          children: "Kalendarz",
        },
        {
          icon: HiOutlineTableCells,
          href: `/${facilityUrl}/admin/clients`,
          children: "Klienci",
        },
        {
          icon: HiOutlineUsers,
          href: `/${facilityUrl}/admin/staff`,
          children: "Pracownicy",
        },
        {
          icon: HiOutlineClipboardDocumentList,
          href: `/${facilityUrl}/admin/reports`,
          children: "Raporty",
        },
      ],
  facilityStaff: !facilityUrl
    ? []
    : [
        {
          icon: HiOutlineCalendarDays,
          href: `/${facilityUrl}/calendar`,
          children: "Mój kalendarz",
        },
        {
          icon: HiOutlineClock,
          href: `/${facilityUrl}/timetable`,
          children: "Mój harmonogram",
        },
        {
          icon: HiOutlineTableCells,
          href: `/${facilityUrl}/clients`,
          children: "Moi klienci",
        },
      ],
  verified: !facilityUrl
    ? []
    : [{icon: HiOutlineVideoCamera, href: `/${facilityUrl}/meetings`, children: "Moje spotkania"}],
  unauthorized: [{icon: HiOutlineQuestionMarkCircle, href: "/help", children: "Pomoc"}],
});
