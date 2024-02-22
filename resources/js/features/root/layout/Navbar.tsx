import {FullLogo} from "components/ui/FullLogo";
import {CLIENT_ICONS, FACILITY_ICONS, STAFF_ICONS, USER_ICONS} from "components/ui/icons";
import {SilentAccessBarrier, cx, useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {BiRegularTable} from "solid-icons/bi";
import {BsCalendar3} from "solid-icons/bs";
import {FaSolidList} from "solid-icons/fa";
import {HiOutlineClipboardDocumentList} from "solid-icons/hi";
import {OcTable3} from "solid-icons/oc";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {SiSwagger} from "solid-icons/si";
import {TbHelp} from "solid-icons/tb";
import {TiSortAlphabetically} from "solid-icons/ti";
import {DEV, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItem} from "../components/navbar/NavigationItem";
import {NavigationSection} from "../components/navbar/NavigationSection";
import s from "./layout.module.scss";

export const Navbar: VoidComponent = () => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const facilityUrl = () => activeFacility()?.url;
  const CommonFacilityItems: VoidComponent = () => (
    <>
      <NavigationItem icon={BsCalendar3} href={`/${facilityUrl()}/calendar`} end routeKey="facility.calendar">
        {/* Consider moving the table pages under reports. */}
        <NavigationItem icon={OcTable3} href={`/${facilityUrl()}/meetings`} routeKey="facility.meetings" small />
        <NavigationItem
          icon={OcTable3}
          href={`/${facilityUrl()}/meeting_attendants`}
          routeKey="facility.meeting_attendants"
          small
        />
        <Show when={isDEV()}>
          <NavigationItem icon={OcTable3} href={`/${facilityUrl()}/system_meetings`} routeKey="DEV System" small />
        </Show>
      </NavigationItem>
      <NavigationItem icon={STAFF_ICONS.menu} href={`/${facilityUrl()}/staff`} routeKey="facility.staff" />
      <NavigationItem icon={CLIENT_ICONS.menu} href={`/${facilityUrl()}/clients`} routeKey="facility.clients" />
    </>
  );
  return (
    <aside class={s.sidebar}>
      <FullLogo class="h-16 p-2 mt-2" />
      <nav class={cx("p-3 overflow-y-auto flex flex-col gap-1", s.navScroll)}>
        <Show when={facilityUrl()}>
          <NavigationSection>
            <SilentAccessBarrier
              facilityUrl={facilityUrl()}
              roles={["facilityAdmin"]}
              fallback={() => (
                <SilentAccessBarrier facilityUrl={facilityUrl()} roles={["facilityStaff"]}>
                  <CommonFacilityItems />
                </SilentAccessBarrier>
              )}
            >
              <CommonFacilityItems />
              <NavigationItem
                icon={HiOutlineClipboardDocumentList}
                href={`/${facilityUrl()}/admin/reports`}
                routeKey="facility.facility_admin.reports"
              />
            </SilentAccessBarrier>
            <NavigationItem icon={FACILITY_ICONS.facility} href={`/${facilityUrl()}/home`} routeKey="facility.home" />
          </NavigationSection>
        </Show>
        <SilentAccessBarrier roles={["globalAdmin"]}>
          <NavigationSection title={t("routes.menu_sections.global_admin")}>
            <NavigationItem icon={FACILITY_ICONS.adminMenu} href="/admin/facilities" routeKey="admin.facilities" />
            <NavigationItem icon={USER_ICONS.adminMenu} href="/admin/users" routeKey="admin.users" />
          </NavigationSection>
        </SilentAccessBarrier>
        <NavigationSection title={t("routes.menu_sections.other")}>
          <NavigationItem icon={TbHelp} href="/help" routeKey="help" />
        </NavigationSection>
        <Show when={isDEV()}>
          <NavigationSection title="DEV">
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
            <NavigationItem icon={TbHelp} href="/help/dev" routeKey="Help" small />
          </NavigationSection>
        </Show>
      </nav>
    </aside>
  );
};
