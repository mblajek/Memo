import {FullLogo} from "components/ui/FullLogo";
import {cx} from "components/utils";
import {
  HiOutlineBuildingOffice,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineQuestionMarkCircle,
  HiOutlineTableCells,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineVideoCamera,
} from "solid-icons/hi";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {DEV, Show, VoidComponent, createMemo} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItemProps, NavigationSection} from "../components/navbar";
import s from "./layout.module.scss";

export const Navbar: VoidComponent = () => {
  const activeFacility = useActiveFacility();
  const facilityUrl = () => activeFacility()?.url;
  const sectionItems = createMemo(() => getSectionItems(facilityUrl()));
  return (
    <aside class={s.sidebar}>
      <FullLogo class="h-16 p-2 mt-2" />
      <nav class={cx("flex-1 p-3 overflow-y-auto", s.navScroll)}>
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
        <Show when={DEV}>
          <NavigationSection
            title="Dev"
            items={[{icon: RiDevelopmentCodeBoxLine, href: "/test-page", children: "/test-page"}]}
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
      children: "Osoby",
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
