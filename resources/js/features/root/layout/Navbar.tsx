import {FullLogo} from "components/ui/FullLogo";
import {LangFunc, cx, useLangFunc} from "components/utils";
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
import {TiSortAlphabetically} from "solid-icons/ti";
import {DEV, Show, VoidComponent, createMemo} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItemProps} from "../components/navbar/NavigationItem";
import {NavigationSection} from "../components/navbar/NavigationSection";
import s from "./layout.module.scss";

export const Navbar: VoidComponent = () => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const facilityUrl = () => activeFacility()?.url;
  const sectionItems = createMemo(() => getSectionItems(t, facilityUrl()));
  return (
    <aside class={s.sidebar}>
      <FullLogo class="h-16 p-2 mt-2" />
      <nav class={cx("flex-1 p-3 overflow-y-auto", s.navScroll)}>
        <Show when={facilityUrl()}>
          <NavigationSection facilityUrl={facilityUrl()} roles={["verified"]} items={sectionItems().verified} />
        </Show>
        <NavigationSection items={sectionItems().unauthorized} />
        <NavigationSection
          roles={["globalAdmin"]}
          items={sectionItems().globalAdmin}
          title={t("routes.menu_sections.system")}
        />
        <Show when={facilityUrl()}>
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityAdmin"]}
            items={sectionItems().facilityAdmin}
            title={t("routes.menu_sections.facility")}
          />
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityStaff"]}
            items={sectionItems().facilityStaff}
            title={t("routes.menu_sections.my_work")}
          />
        </Show>
        <Show when={DEV}>
          <NavigationSection title="DEV" items={getDevSectionItems()} />
        </Show>
      </nav>
    </aside>
  );
};

function getSectionItems(
  t: LangFunc,
  facilityUrl?: string,
): {
  globalAdmin: NavigationItemProps[];
  facilityAdmin: NavigationItemProps[];
  facilityStaff: NavigationItemProps[];
  verified: NavigationItemProps[];
  unauthorized: NavigationItemProps[];
} {
  return {
    globalAdmin: [
      {
        icon: HiOutlineBuildingOffice,
        href: "/admin/facilities",
        routeKey: "admin.facilities",
      },
      {
        icon: HiOutlineUserGroup,
        href: "/admin/users",
        routeKey: "admin.users",
      },
    ],
    facilityAdmin: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineCalendarDays,
            href: `/${facilityUrl}/admin/calendar`,
            routeKey: "facility.admin.calendar",
          },
          {
            icon: HiOutlineTableCells,
            href: `/${facilityUrl}/admin/clients`,
            routeKey: "facility.admin.clients",
          },
          {
            icon: HiOutlineUsers,
            href: `/${facilityUrl}/admin/staff`,
            routeKey: "facility.admin.staff",
          },
          {
            icon: HiOutlineClipboardDocumentList,
            href: `/${facilityUrl}/admin/reports`,
            routeKey: "facility.admin.reports",
          },
        ],
    facilityStaff: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineCalendarDays,
            href: `/${facilityUrl}/calendar`,
            routeKey: "facility.calendar",
          },
          {
            icon: HiOutlineClock,
            href: `/${facilityUrl}/timetable`,
            routeKey: "facility.timetable",
          },
          {
            icon: HiOutlineTableCells,
            href: `/${facilityUrl}/clients`,
            routeKey: "facility.clients",
          },
        ],
    verified: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineVideoCamera,
            href: `/${facilityUrl}/meetings`,
            routeKey: "facility.meetings",
          },
        ],
    unauthorized: [
      {
        icon: HiOutlineQuestionMarkCircle,
        href: "/help",
        routeKey: "help",
      },
    ],
  };
}

function getDevSectionItems(): NavigationItemProps[] {
  return [
    {
      icon: TiSortAlphabetically,
      href: "/dev/dictionaries",
      routeKey: "Dictionaries",
    },
    {
      icon: RiDevelopmentCodeBoxLine,
      href: "/dev/test-page",
      routeKey: "/dev/test-page",
    },
  ];
}
