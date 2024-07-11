import {A} from "@solidjs/router";
import {FullLogo} from "components/ui/FullLogo";
import {ADMIN_ICONS, CLIENT_ICONS, FACILITY_ICONS, STAFF_ICONS, USER_ICONS} from "components/ui/icons";
import {SilentAccessBarrier, cx, useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {BiRegularErrorAlt, BiRegularTable} from "solid-icons/bi";
import {BsCalendar3} from "solid-icons/bs";
import {FaSolidList} from "solid-icons/fa";
import {HiOutlineClipboardDocumentList} from "solid-icons/hi";
import {OcTable3} from "solid-icons/oc";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {SiSwagger} from "solid-icons/si";
import {TbCalendarTime, TbHelp} from "solid-icons/tb";
import {TiSortAlphabetically} from "solid-icons/ti";
import {DEV, ParentComponent, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItem} from "../components/navbar/NavigationItem";
import {NavigationSection} from "../components/navbar/NavigationSection";
import {useThemeControl} from "../components/theme_control";
import s from "./layout.module.scss";

export const Navbar: VoidComponent = () => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const {theme} = useThemeControl();
  const systemStatusMonitor = useSystemStatusMonitor();
  const facilityUrl = () => activeFacility()?.url;

  const FacilityAdminOrStaffBarrier: ParentComponent = (props) => (
    <SilentAccessBarrier
      roles={["facilityAdmin"]}
      fallback={() => <SilentAccessBarrier roles={["facilityStaff"]}>{props.children}</SilentAccessBarrier>}
    >
      {props.children}
    </SilentAccessBarrier>
  );

  const themeStyle = () => {
    const t = theme();
    return {"--navbar-color": t === "light" ? "#f3f0e0" : t === "dark" ? "#e3e0d0" : (t satisfies never)};
  };
  return (
    <aside class={s.sidebar} style={themeStyle()}>
      <FullLogo class="h-16 p-2 mt-2" />
      <nav class={cx("p-3 overflow-y-auto flex flex-col gap-1", s.navScroll)}>
        <Show when={facilityUrl()}>
          <NavigationSection>
            <FacilityAdminOrStaffBarrier>
              <NavigationItem icon={BsCalendar3} href={`/${facilityUrl()}/calendar`} end routeKey="facility.calendar" />
              <NavigationItem icon={STAFF_ICONS.menu} href={`/${facilityUrl()}/staff`} routeKey="facility.staff" />
              <NavigationItem icon={CLIENT_ICONS.menu} href={`/${facilityUrl()}/clients`} routeKey="facility.clients" />
              <NavigationItem icon={ADMIN_ICONS.menu} href={`/${facilityUrl()}/admins`} routeKey="facility.admins" />
            </FacilityAdminOrStaffBarrier>
            {/* TODO: Create the facility page when there is useful information on it. */}
            {/* <NavigationItem icon={FACILITY_ICONS.facility} href={`/${facilityUrl()}/home`} routeKey="facility.home" /> */}
          </NavigationSection>
          <SilentAccessBarrier roles={["facilityAdmin"]}>
            <NavigationSection name={t("routes.menu_sections.facility_admin")}>
              <NavigationItem
                icon={TbCalendarTime}
                href={`/${facilityUrl()}/admin/time-tables`}
                routeKey="facility.facility_admin.time_tables"
              >
                <NavigationItem
                  icon={TbCalendarTime}
                  href={`/${facilityUrl()}/admin/time-tables`}
                  routeKey="facility.facility_admin.time_tables_calendar"
                  small
                  end
                />
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/admin/time-tables/staff`}
                  routeKey="facility.facility_admin.time_tables_staff"
                  small
                />
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/admin/time-tables/facility`}
                  routeKey="facility.facility_admin.time_tables_facility"
                  small
                />
              </NavigationItem>
              <NavigationItem
                icon={HiOutlineClipboardDocumentList}
                href={`/${facilityUrl()}/admin/reports`}
                routeKey="facility.facility_admin.reports"
              >
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/meetings`}
                  routeKey="facility.meetings"
                  small
                />
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/meeting_attendants`}
                  routeKey="facility.meeting_attendants"
                  small
                />
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/meeting_clients`}
                  routeKey="facility.meeting_clients"
                  small
                />
                <Show when={isDEV()}>
                  <NavigationItem
                    icon={OcTable3}
                    href={`/${facilityUrl()}/system_meetings`}
                    routeKey="DEV System"
                    small
                  />
                </Show>
              </NavigationItem>
            </NavigationSection>
          </SilentAccessBarrier>
        </Show>
        <SilentAccessBarrier roles={["globalAdmin"]}>
          <NavigationSection name={t("routes.menu_sections.global_admin")}>
            <NavigationItem icon={FACILITY_ICONS.adminMenu} href="/admin/facilities" routeKey="admin.facilities" />
            <NavigationItem icon={USER_ICONS.adminMenu} href="/admin/users" routeKey="admin.users" />
          </NavigationSection>
        </SilentAccessBarrier>
        <NavigationSection name={t("routes.menu_sections.other")}>
          <NavigationItem icon={TbHelp} href="/help" routeKey="help" />
        </NavigationSection>
        <Show when={isDEV()}>
          <NavigationSection name="DEV">
            <NavigationItem icon={FaSolidList} href="/dev/attributes" routeKey="Attributes" small />
            <NavigationItem icon={TiSortAlphabetically} href="/dev/dictionaries" routeKey="Dictionaries" small />
            <Show when={DEV}>
              <NavigationItem icon={RiDevelopmentCodeBoxLine} href="/dev/test-page" routeKey="Test page" small />
            </Show>
            <NavigationItem
              icon={BiRegularTable}
              href="/dev/local-storage"
              routeKey="Local storage"
              target="_blank"
              small
            />
            <NavigationItem icon={SiSwagger} href="/api/documentation" routeKey="API" target="_blank" small />
            <NavigationItem icon={BiRegularErrorAlt} href="/dev/crash" routeKey="Crash" small />
            <NavigationItem icon={TbHelp} href="/help/dev" routeKey="Help" small />
          </NavigationSection>
        </Show>
      </nav>
      <div class="grow" />
      <A href="/help/about" class="p-2 !text-grey-text">
        {t("app_name")} {systemStatusMonitor.status()?.version}
      </A>
    </aside>
  );
};
