import {Navigate, Route, RouteProps, Router, useNavigate, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AppContextProvider} from "app_context";
import {capitalizeString} from "components/ui/Capitalize";
import {AccessBarrier} from "components/utils/AccessBarrier";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {System} from "data-access/memo-api/groups/System";
import {BackdoorRoutes} from "dev-pages/BackdoorRoutes";
import {DevRoutes} from "dev-pages/DevRoutes";
import NotFound from "features/not-found/components/NotFound";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {PageWithTheme} from "features/root/components/theme_control";
import {Favicon} from "features/root/Favicon";
import {ParentComponent, VoidProps, createEffect, splitProps, type VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {clearAllHistoryState} from "./components/persistence/history_persistence";
import {activeFacilityId} from "./state/activeFacilityId.state";

const AboutPage = lazyAutoPreload(() => import("features/root/pages/help/About.page"));
const AdminFacilitiesListPage = lazyAutoPreload(() => import("features/root/pages/AdminFacilitiesList.page"));
const AdminUsersListPage = lazyAutoPreload(() => import("features/root/pages/AdminUsersList.page"));
const CalendarPage = lazyAutoPreload(() => import("features/root/pages/Calendar.page"));
const ClientCreatePage = lazyAutoPreload(() => import("features/root/pages/ClientCreate.page"));
const ClientDetailsPage = lazyAutoPreload(() => import("features/root/pages/ClientDetails.page"));
const ClientsListPage = lazyAutoPreload(() => import("features/root/pages/ClientsList.page"));
const DevHelpPage = lazyAutoPreload(() => import("features/root/pages/help/DevHelp.page"));
const FacilityAdminsListPage = lazyAutoPreload(() => import("features/root/pages/FacilityAdminsList.page"));
const FacilityHomePage = lazyAutoPreload(() => import("features/root/pages/FacilityHome.page"));
const HelpPage = lazyAutoPreload(() => import("features/root/pages/help/Help.page"));
const LoginPage = lazyAutoPreload(() => import("features/authentication/pages/Login.page"));
const MeetingsListPage = lazyAutoPreload(() => import("features/root/pages/MeetingsList.page"));
const MeetingAttendantsListPage = lazyAutoPreload(() => import("features/root/pages/MeetingAttendantsList.page"));
const MeetingClientsListPage = lazyAutoPreload(() => import("features/root/pages/MeetingClientsList.page"));
const MeetingSeriesPage = lazyAutoPreload(() => import("features/root/pages/MeetingSeries.page"));
const ReportsPage = lazyAutoPreload(() => import("features/root/pages/Reports.page"));
const RootPage = lazyAutoPreload(() => import("features/root/pages/Root.page"));
const StaffDetailsPage = lazyAutoPreload(() => import("features/root/pages/StaffDetails.page"));
const StaffListPage = lazyAutoPreload(() => import("features/root/pages/StaffList.page"));
const SystemMeetingsListPage = lazyAutoPreload(() => import("features/root/pages/SystemMeetingsList.page"));
const TimeTables = lazyAutoPreload(() => import("features/root/pages/TimeTables.page"));
const WeeklyTimeTables = lazyAutoPreload(() => import("features/root/pages/WeeklyTimeTables.page"));

const App: VoidComponent = () => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);

  /**
   * A component for redirecting the __facility links to an actual facility.
   *
   * Such links make sense in places like documentation, where the actual facility URL is not known.
   */
  const RedirectToFacility = (() => {
    const params = useParams();
    const navigate = useNavigate();
    createEffect(() => {
      if (facilitiesQuery.isSuccess && activeFacilityId()) {
        const activeFacility = facilitiesQuery.data!.find((facility) => facility.id === activeFacilityId());
        if (activeFacility) {
          navigate(`/${activeFacility.url}/${params.facilityPath}`);
        }
      }
    });
    return <></>;
  }) satisfies VoidComponent;

  return (
    <AppContextProvider>
      <Favicon />
      <Router>
        <Route path="/" component={PageWithTheme}>
          <LeafRoute routeKey="login" path="/login" component={LoginPage} />
          <Route path="/" component={RootPage}>
            <UnknownNotFound />
            <Route path="/" component={() => <Navigate href="/help" />} />
            <DevRoutes />
            <Route path="/help">
              <LeafRoute routeKey="help_pages.about" path="/about" component={AboutPage} />
              <Route path="/" component={() => <Navigate href="index" />} />
              <LeafRoute routeKey="help" path="/*helpPath" component={HelpPage} />
              <Route path="/dev">
                <LeafRoute routeKey="help" path="/" component={() => <Navigate href="index" />} />
                <LeafRoute routeKey="help" path="/*helpPath" component={DevHelpPage} />
              </Route>
            </Route>
            <Route
              path="/admin"
              component={(props) => <AccessBarrier roles={["globalAdmin"]}>{props.children}</AccessBarrier>}
            >
              <UnknownNotFound />
              <LeafRoute routeKey="admin.facilities" path="/facilities" component={AdminFacilitiesListPage} />
              <LeafRoute routeKey="admin.users" path="/users" component={AdminUsersListPage} />
            </Route>
            <Route path="/__facility/*facilityPath" component={RedirectToFacility} />
            <Route
              path="/:facilityUrl"
              matchFilters={{facilityUrl: facilitiesQuery.data?.map(({url}) => url) || []}}
              component={(props) => <AccessBarrier roles={["facilityMember"]}>{props.children}</AccessBarrier>}
            >
              <UnknownNotFound />
              <Route path="/" component={() => <Navigate href="home" />} />
              <LeafRoute routeKey="facility.home" path="/home" component={FacilityHomePage} />
              <Route path="/" component={FacilityAdminOrStaffPages}>
                <LeafRoute routeKey="facility.calendar" path="/calendar" component={CalendarPage} />
                <LeafRoute routeKey="facility.meetings" path="/meetings" component={MeetingsListPage} />
                <LeafRoute
                  routeKey="facility.meeting_series"
                  path="/meeting-series/:fromMeetingId"
                  component={MeetingSeriesPage}
                />
                <LeafRoute
                  routeKey="facility.meeting_attendants"
                  path="/meeting-attendants"
                  component={MeetingAttendantsListPage}
                />
                <LeafRoute
                  routeKey="facility.meeting_clients"
                  path="/meeting-clients"
                  component={MeetingClientsListPage}
                />
                <LeafRoute routeKey="System meetings" path="/system-meetings" component={SystemMeetingsListPage} />
                <Route path="/staff">
                  <LeafRoute routeKey="facility.staff" path="/" component={StaffListPage} />
                  <LeafRoute routeKey="facility.staff_details" path="/:userId" component={StaffDetailsPage} />
                </Route>
                <Route path="/clients">
                  <LeafRoute routeKey="facility.clients" path="/" component={ClientsListPage} />
                  <LeafRoute routeKey="facility.client_create" path="/create" component={ClientCreatePage} />
                  <LeafRoute routeKey="facility.client_details" path="/:userId" component={ClientDetailsPage} />
                </Route>
                <Route path="/admins">
                  <LeafRoute routeKey="facility.admins" path="/" component={FacilityAdminsListPage} />
                </Route>
              </Route>
              <Route
                path="/admin"
                component={(props) => <AccessBarrier roles={["facilityAdmin"]}>{props.children}</AccessBarrier>}
              >
                <UnknownNotFound />
                <Route path="/time-tables">
                  <LeafRoute routeKey="facility.facility_admin.time_tables" path="/" component={TimeTables} />
                  <LeafRoute
                    routeKey="facility.facility_admin.time_tables_weekly"
                    path="/weekly"
                    component={WeeklyTimeTables}
                  />
                </Route>
                <LeafRoute routeKey="facility.facility_admin.reports" path="/reports" component={ReportsPage} />
              </Route>
            </Route>
          </Route>
        </Route>
        <BackdoorRoutes />
      </Router>
    </AppContextProvider>
  );
};
export default App;

type LeafRouteProps<S extends string> = RouteProps<S> &
  Required<Pick<RouteProps<S>, "component">> & {
    /** A translations sub-key in routes defining the page title. */
    routeKey: string;
  };

/** A leaf route for a page, also setting the page title based on routeKey. */
const LeafRoute = <S extends string>(allProps: VoidProps<LeafRouteProps<S>>) => {
  const [props, routeProps] = splitProps(allProps, ["routeKey", "component"]);
  const t = useLangFunc();
  const pageName = () => {
    const name = t(`routes.${props.routeKey}`, {defaultValue: ""});
    if (!name) {
      // Don't capitalise.
      return props.routeKey;
    }
    return capitalizeString(name);
  };
  return (
    <Route
      {...routeProps}
      component={(innerProps) => (
        <>
          <AppTitlePrefix prefix={pageName()} />
          <Dynamic component={props.component} {...innerProps} />
        </>
      )}
      preload={(args) => {
        // Clear history state on browser refresh. Some browsers keep the state after a refresh which seems wrong.
        if (args.intent === "initial") {
          clearAllHistoryState();
        }
      }}
    />
  );
};

const UnknownNotFound: VoidComponent = () => <Route path="/*" component={NotFound} />;

const FacilityAdminOrStaffPages: ParentComponent = (props) => (
  <AccessBarrier
    roles={["facilityAdmin"]}
    fallback={() => <AccessBarrier roles={["facilityStaff"]}>{props.children}</AccessBarrier>}
  >
    {props.children}
  </AccessBarrier>
);
