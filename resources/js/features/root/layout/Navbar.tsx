import {A} from "@solidjs/router";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {Button} from "components/ui/Button";
import {FullLogo, ShortChangingLogo} from "components/ui/FullLogo";
import {createHoverSignal, hoverSignal} from "components/ui/hover_signal";
import {adminIcons, clientIcons, facilityIcons, staffIcons, userIcons} from "components/ui/icons";
import {createScrollableUpMarker} from "components/ui/ScrollableUpMarker";
import {title} from "components/ui/title";
import {SilentAccessBarrier} from "components/utils/AccessBarrier";
import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {useNewspaper} from "components/utils/newspaper";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {BaseAppVersion} from "features/system-status/app_version";
import {BiRegularErrorAlt, BiRegularTable, BiSolidArrowFromRight, BiSolidArrowToRight} from "solid-icons/bi";
import {BsCalendar3} from "solid-icons/bs";
import {CgTrack} from "solid-icons/cg";
import {FaRegularNewspaper, FaSolidList} from "solid-icons/fa";
import {FiLoader} from "solid-icons/fi";
import {HiOutlineClipboardDocumentList} from "solid-icons/hi";
import {IoReloadSharp} from "solid-icons/io";
import {OcLog3, OcTable3} from "solid-icons/oc";
import {RiDevelopmentCodeBoxLine} from "solid-icons/ri";
import {SiSwagger} from "solid-icons/si";
import {TbCalendarCode, TbCalendarTime, TbHelp} from "solid-icons/tb";
import {TiSortAlphabetically} from "solid-icons/ti";
import {VsChromeClose} from "solid-icons/vs";
import {createContext, createSignal, DEV, ParentComponent, Show, Signal, useContext, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {useActiveFacility} from "state/activeFacilityId.state";
import {NavigationItem} from "../components/navbar/NavigationItem";
import {NavigationSection} from "../components/navbar/NavigationSection";
import {useThemeControl} from "../components/theme_control";

type _Directives = typeof title | typeof hoverSignal;

const NavbarContext = createContext<NavbarContextValue>();

interface NavbarContextValue {
  readonly collapsed: Signal<boolean>;
}

export function useNavbarContext() {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("Not in navbar context");
  }
  return context;
}

export const Navbar: VoidComponent = () => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const activeFacility = useActiveFacility();
  const {theme} = useThemeControl();
  const facilityUrl = () => activeFacility()?.url;
  const newspaper = useNewspaper();
  const [collapsed, setCollapsed] = createSignal(false);
  const navbarHover = createHoverSignal();
  const delayedNavbarHover = delayedAccessor(navbarHover, {timeMs: 1000, outputImmediately: (v) => v});
  createPersistence({
    value: () => ({
      collapsed: collapsed(),
    }),
    onLoad: (value) => {
      setCollapsed(value.collapsed);
    },
    storage: localStorageStorage("Navbar"),
  });

  const FacilityAdminOrStaffBarrier: ParentComponent = (props) => (
    <SilentAccessBarrier
      roles={["facilityAdmin"]}
      fallback={() => <SilentAccessBarrier roles={["facilityStaff"]}>{props.children}</SilentAccessBarrier>}
    >
      {props.children}
    </SilentAccessBarrier>
  );

  const {ScrollableUpMarker, scrollableRef} = createScrollableUpMarker();
  const themeStyle = () => {
    const t = theme();
    return {"--navbar-color": t === "light" ? "#f3f0e0" : t === "dark" ? "#e3e0d0" : (t satisfies never)};
  };
  return (
    <NavbarContext.Provider value={{collapsed: [collapsed, setCollapsed]}}>
      <aside
        class={cx(
          "min-w-20 max-w-64 flex flex-col overflow-y-auto border-r border-gray-300 relative",
          collapsed() ? "text-xs" : undefined,
        )}
        use:hoverSignal={navbarHover}
        style={{
          "background-color": "var(--navbar-color)",
          "grid-area": "sidebar",
          ...themeStyle(),
        }}
      >
        <Button
          class={cx(
            "absolute top-px right-0 border border-e-0 rounded-s border-memo-active bg-white transition-opacity hover:opacity-100",
            delayedNavbarHover() ? "opacity-20" : "opacity-0",
          )}
          title={collapsed() ? t("actions.expand") : t("actions.collapse")}
          onClick={() => {
            setCollapsed(!collapsed());
            if (collapsed()) {
              navbarHover.setHover(false);
            }
          }}
        >
          <Dynamic component={collapsed() ? BiSolidArrowToRight : BiSolidArrowFromRight} size="16" />
        </Button>
        <Show when={!collapsed()}>
          <FullLogo class="h-16 p-2 my-2" />
        </Show>
        <ScrollableUpMarker />
        <nav
          ref={scrollableRef}
          class={cx(collapsed() ? "pl-1" : "pl-2 pr-1", "col-start-1 row-start-1 overflow-y-auto flex flex-col gap-1")}
          style={{"--sb-track-color": "var(--navbar-color)"}}
        >
          <Show when={collapsed()}>
            <ShortChangingLogo class="self-center w-12 h-12 p-1 my-2" />
          </Show>
          <Show when={facilityUrl()}>
            <NavigationSection>
              <FacilityAdminOrStaffBarrier>
                <NavigationItem
                  icon={BsCalendar3}
                  href={`/${facilityUrl()}/calendar`}
                  end
                  routeKey="facility.calendar"
                />
                <NavigationItem icon={staffIcons.Menu} href={`/${facilityUrl()}/staff`} routeKey="facility.staff" />
                <NavigationItem
                  icon={clientIcons.Menu}
                  href={`/${facilityUrl()}/clients`}
                  routeKey="facility.clients"
                />
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
            <NavigationSection name="DEV" compact>
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
              <SilentAccessBarrier roles={["developer"]}>
                <NavigationItem icon={OcLog3} href="/dev/logs" routeKey="Logs" small />
                <NavigationItem icon={CgTrack} href="/dev/feature-use" routeKey="Feature use" small />
              </SilentAccessBarrier>
              <NavigationItem icon={FiLoader} href="/dev/preload-statuses" routeKey="Preload" small />
              <NavigationItem icon={BiRegularErrorAlt} href="/dev/crash" routeKey="Crash" small />
              <NavigationItem icon={TbHelp} href="/help/dev" routeKey="Help" small />
            </NavigationSection>
          </Show>
        </nav>
        <div class="grow" />
        <div
          class={cx("flex", collapsed() ? "flex-col-reverse items-center" : "items-end justify-between", "p-2 gap-1")}
        >
          <div class={cx("flex flex-col", collapsed() ? "items-center" : undefined)}>
            <A href="/help/about" class="!text-grey-text">
              <Show when={!collapsed()}>{t("app_name")} </Show>
              <BaseAppVersion />
            </A>
            <Show when={newspaper.hasNews()}>
              <div class="flex items-center gap-2">
                <A href="/help/changelog">
                  <Show when={!collapsed()}>
                    <FaRegularNewspaper class="inlineIcon" />
                  </Show>{" "}
                  {t("changelog.short_text")}
                </A>
                <Show when={!collapsed()}>
                  <Button onClick={() => newspaper.reportNewsRead()}>
                    <VsChromeClose size="14" class="mt-1 !text-grey-text" />
                  </Button>
                </Show>
              </div>
            </Show>
          </div>
          <Button
            class={cx(
              "p-1 rounded-full active:bg-select transition-colors",
              invalidate.isThrottled() ? "text-gray-300" : "text-grey-text hover:text-memo-active",
            )}
            style={{"transition-duration": "300ms"}}
            disabled={invalidate.isThrottled()}
            onClick={() => invalidate.everythingThrottled()}
            title={`${t("refresh_button")}${invalidate.isThrottled() ? `\n${t("refresh_button.disabled")}` : ""}`}
          >
            <IoReloadSharp class="ml-px text-current" size="18" />
          </Button>
        </div>
      </aside>
    </NavbarContext.Provider>
  );
};
