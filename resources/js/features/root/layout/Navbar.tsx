import {A} from "@solidjs/router";
import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {adminIcons, clientIcons, facilityIcons, staffIcons, userIcons} from "components/ui/icons";
import {SilentAccessBarrier, cx, useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {BaseAppVersion} from "features/system-status/app_version";
import {BiRegularErrorAlt, BiRegularTable} from "solid-icons/bi";
import {BsCalendar3} from "solid-icons/bs";
import {FaSolidList} from "solid-icons/fa";
import {HiOutlineClipboardDocumentList} from "solid-icons/hi";
import {IoReloadSharp} from "solid-icons/io";
import {OcTable3} from "solid-icons/oc";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {SiSwagger} from "solid-icons/si";
import {TbCalendarCode, TbCalendarTime, TbHelp} from "solid-icons/tb";
import {TiSortAlphabetically} from "solid-icons/ti";
import {DEV, ParentComponent, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItem} from "../components/navbar/NavigationItem";
import {NavigationSection} from "../components/navbar/NavigationSection";
import {useThemeControl} from "../components/theme_control";
import s from "./layout.module.scss";

export const Navbar: VoidComponent = () => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const activeFacility = useActiveFacility();
  const {theme} = useThemeControl();
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
              <NavigationItem icon={staffIcons.Menu} href={`/${facilityUrl()}/staff`} routeKey="facility.staff" />
              <NavigationItem icon={clientIcons.Menu} href={`/${facilityUrl()}/clients`} routeKey="facility.clients" />
              <NavigationItem icon={adminIcons.Menu} href={`/${facilityUrl()}/admins`} routeKey="facility.admins" />
            </FacilityAdminOrStaffBarrier>
            {/* TODO: Create the facility page when there is useful information on it. */}
            {/* <NavigationItem icon={facilityIcons.facility} href={`/${facilityUrl()}/home`} routeKey="facility.home" /> */}
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
                  icon={TbCalendarCode}
                  href={`/${facilityUrl()}/admin/time-tables/weekly`}
                  routeKey="facility.facility_admin.time_tables_weekly"
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
                  href={`/${facilityUrl()}/meeting-attendants`}
                  routeKey="facility.meeting_attendants"
                  small
                />
                <NavigationItem
                  icon={OcTable3}
                  href={`/${facilityUrl()}/meeting-clients`}
                  routeKey="facility.meeting_clients"
                  small
                />
                <Show when={isDEV()}>
                  <NavigationItem
                    icon={OcTable3}
                    href={`/${facilityUrl()}/system-meetings`}
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
            <NavigationItem icon={facilityIcons.AdminMenu} href="/admin/facilities" routeKey="admin.facilities" />
            <NavigationItem icon={userIcons.AdminMenu} href="/admin/users" routeKey="admin.users" />
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
      <div class="p-2 flex items-end gap-2 justify-between">
        <A href="/help/about" class="!text-grey-text">
          {t("app_name")} <BaseAppVersion />
        </A>
        <Button
          class={cx(
            "p-1 rounded-full active:bg-select transition-colors",
            invalidate.isThrottled() ? "text-gray-300" : "text-grey-text hover:text-memo-active",
          )}
          style={{"transition-duration": "300ms"}}
          disabled={invalidate.isThrottled()}
          onClick={() => invalidate.everythingThrottled()}
          title={[
            `${t("refresh_button")}${invalidate.isThrottled() ? `\n${t("refresh_button.disabled")}` : ""}`,
            {hideOnClick: true},
          ]}
        >
          <IoReloadSharp class="ml-px text-current" size="18" />
        </Button>
      </div>
    </aside>
  );
};
