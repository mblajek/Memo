import {FullLogo} from "components/ui/FullLogo";
import {CLIENT_ICONS, FACILITY_ICONS, STAFF_ICONS, USER_ICONS} from "components/ui/icons";
import {LangFunc, cx, useLangFunc} from "components/utils";
import {BiRegularTable} from "solid-icons/bi";
import {BsCalendar3, BsCalendar3Week} from "solid-icons/bs";
import {FaSolidList} from "solid-icons/fa";
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineTableCells,
} from "solid-icons/hi";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {TbHelp} from "solid-icons/tb";
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
        icon: FACILITY_ICONS.menu,
        href: "/admin/facilities",
        routeKey: "admin.facilities",
      },
      {
        icon: USER_ICONS.menu,
        href: "/admin/users",
        routeKey: "admin.users",
      },
    ],
    facilityAdmin: !facilityUrl
      ? []
      : [
          {
            icon: BsCalendar3,
            href: `/${facilityUrl}/admin/calendar`,
            routeKey: "facility.admin.calendar",
          },
          {
            icon: CLIENT_ICONS.menu,
            href: `/${facilityUrl}/admin/clients`,
            routeKey: "facility.admin.clients",
          },
          {
            icon: STAFF_ICONS.staffMembers,
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
            icon: BsCalendar3Week,
            href: `/${facilityUrl}/meetings`,
            routeKey: "facility.meetings",
          },
        ],
    unauthorized: [
      {
        icon: TbHelp,
        href: "/help",
        routeKey: "help",
      },
    ],
  };
}

function getDevSectionItems(): NavigationItemProps[] {
  return [
    {
      icon: FaSolidList,
      href: "/dev/attributes",
      routeKey: "Attributes",
    },
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
    {
      icon: BiRegularTable,
      href: "/dev/local-storage",
      routeKey: "Local storage",
      target: "_blank",
    },
  ];
}
