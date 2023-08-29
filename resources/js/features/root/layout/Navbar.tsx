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
import {facilityId} from "state/facilityId.state";
import {NavigationSection, NavigationSectionProps} from "../components/navbar";
import s from "./style.module.scss";

export const Navbar: Component = () => {
  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions());

  const facilityUrl = () => facilitiesQuery.data?.find((facility) => facility.id === facilityId())?.url;

  const sectionItems = createMemo(() => getSectionItems(facilityUrl()));

  return (
    <aside class={cx(s.sidebar)}>
      <div class={cx("flex flex-row justify-between py-4 px-8 bg-inherit")}>
        <img src="/img/memo_logo.svg" class="h-14" />
        <img src="/img/cpd_children_logo.svg" class="h-12" />
      </div>
      <nav class={cx("flex-1 px-8 py-4 overflow-y-auto", s.navScroll)}>
        <Show when={facilityUrl()}>
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["verified"]}
            items={sectionItems().looseFacilityItems}
          />
        </Show>
        <NavigationSection items={sectionItems().looseItems} />
        <NavigationSection roles={["globalAdmin"]} items={sectionItems().system} title="System" />
        <Show when={facilityUrl()}>
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityAdmin"]}
            items={sectionItems().facility}
            title="Placówka"
          />
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityStaff"]}
            items={sectionItems().work}
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
  system: NavigationSectionProps["items"];
  facility: NavigationSectionProps["items"];
  work: NavigationSectionProps["items"];
  looseFacilityItems: NavigationSectionProps["items"];
  looseItems: NavigationSectionProps["items"];
} => ({
  system: [
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
  facility: !facilityUrl
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
  work: !facilityUrl
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
  looseFacilityItems: !facilityId
    ? []
    : [{icon: HiOutlineVideoCamera, href: `/${facilityUrl}/meetings`, children: "Moje spotkania"}],
  looseItems: [{icon: HiOutlineQuestionMarkCircle, href: "/help", children: "Pomoc"}],
});
