import {Capitalize} from "components/ui/Capitalize";
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
          title={t("navigation.sections.system")}
        />
        <Show when={facilityUrl()}>
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityAdmin"]}
            items={sectionItems().facilityAdmin}
            title={t("navigation.sections.facility")}
          />
          <NavigationSection
            facilityUrl={facilityUrl()}
            roles={["facilityStaff"]}
            items={sectionItems().facilityStaff}
            title={t("navigation.sections.my_work")}
          />
        </Show>
        <Show when={DEV}>
          <NavigationSection
            title="DEV"
            items={[{icon: RiDevelopmentCodeBoxLine, href: "/test-page", children: "/test-page"}]}
          />
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
        children: <Capitalize text={t("models.facility._name_plural")} />,
      },
      {
        icon: HiOutlineUserGroup,
        href: "/admin/users",
        children: <Capitalize text={t("models.user._name_plural")} />,
      },
    ],
    facilityAdmin: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineCalendarDays,
            href: `/${facilityUrl}/admin/calendar`,
            children: t("navigation.facility_admin_section.calendar"),
          },
          {
            icon: HiOutlineTableCells,
            href: `/${facilityUrl}/admin/clients`,
            children: t("navigation.facility_admin_section.clients"),
          },
          {
            icon: HiOutlineUsers,
            href: `/${facilityUrl}/admin/staff`,
            children: t("navigation.facility_admin_section.staff"),
          },
          {
            icon: HiOutlineClipboardDocumentList,
            href: `/${facilityUrl}/admin/reports`,
            children: t("navigation.facility_admin_section.reports"),
          },
        ],
    facilityStaff: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineCalendarDays,
            href: `/${facilityUrl}/calendar`,
            children: t("navigation.facility_staff_section.calendar"),
          },
          {
            icon: HiOutlineClock,
            href: `/${facilityUrl}/timetable`,
            children: t("navigation.facility_staff_section.timetable"),
          },
          {
            icon: HiOutlineTableCells,
            href: `/${facilityUrl}/clients`,
            children: t("navigation.facility_staff_section.clients"),
          },
        ],
    verified: !facilityUrl
      ? []
      : [
          {
            icon: HiOutlineVideoCamera,
            href: `/${facilityUrl}/meetings`,
            children: t("navigation.verified_section.meetings"),
          },
        ],
    unauthorized: [
      {
        icon: HiOutlineQuestionMarkCircle,
        href: "/help",
        children: t("navigation.help"),
      },
    ],
  };
}
