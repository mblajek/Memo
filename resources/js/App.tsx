import {Navigate, Route, RouteProps, Router, useNavigate, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AppContextProvider} from "app_context";
import {AccessBarrier} from "components/utils";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {System} from "data-access/memo-api/groups";
import {BackdoorRoutes} from "dev-pages/BackdoorRoutes";
import {DevRoutes} from "dev-pages/DevRoutes";
import NotFound from "features/not-found/components/NotFound";
import {PageWithTheme} from "features/root/components/theme_control";
import {ParentComponent, VoidProps, createEffect, splitProps, type VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {MemoRouteTitle} from "./features/root/MemoRouteTitle";
import {activeFacilityId} from "./state/activeFacilityId.state";

const AdminFacilitiesListPage = lazyAutoPreload(() => import("features/root/pages/AdminFacilitiesList.page"));
const AdminUsersListPage = lazyAutoPreload(() => import("features/root/pages/AdminUsersList.page"));
const CalendarPage = lazyAutoPreload(() => import("features/root/pages/Calendar.page"));
const ClientDetailsPage = lazyAutoPreload(() => import("features/root/pages/ClientDetails.page"));
const ClientsListPage = lazyAutoPreload(() => import("features/root/pages/ClientsList.page"));
const DevHelpPage = lazyAutoPreload(() => import("features/root/pages/help/DevHelp.page"));
const FacilityHomePage = lazyAutoPreload(() => import("features/root/pages/FacilityHome.page"));
const HelpPage = lazyAutoPreload(() => import("features/root/pages/help/Help.page"));
const LoginPage = lazyAutoPreload(() => import("features/authentication/pages/Login.page"));
const MeetingsListPage = lazyAutoPreload(() => import("features/root/pages/MeetingsList.page"));
const MeetingAttendantsListPage = lazyAutoPreload(() => import("features/root/pages/MeetingAttendantsList.page"));
const ReportsPage = lazyAutoPreload(() => import("features/root/pages/Reports.page"));
const RootPage = lazyAutoPreload(() => import("features/root/pages/Root.page"));
const StaffDetailsPage = lazyAutoPreload(() => import("features/root/pages/StaffDetails.page"));
const StaffListPage = lazyAutoPreload(() => import("features/root/pages/StaffList.page"));
const AboutPage = lazyAutoPreload(() => import("features/root/pages/help/About.page"));
const SystemMeetingsListPage = lazyAutoPreload(() => import("features/root/pages/SystemMeetingsList.page"));

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
            <Route path="/admin" component={GlobalAdminPages}>
              <UnknownNotFound />
              <LeafRoute routeKey="admin.facilities" path="/facilities" component={AdminFacilitiesListPage} />
              <LeafRoute routeKey="admin.users" path="/users" component={AdminUsersListPage} />
            </Route>
            <Route path="/__facility/*facilityPath" component={RedirectToFacility} />
          </Route>
          <Route
            path="/:facilityUrl"
            matchFilters={{facilityUrl: facilitiesQuery.data?.map(({url}) => url) || []}}
            component={RootPageWithFacility}
          >
            <UnknownNotFound />
            <Route path="/" component={() => <Navigate href="home" />} />
            <LeafRoute routeKey="facility.home" path="/home" component={FacilityHomePage} />
            <Route path="/" component={FacilityAdminOrStaffPages}>
              <LeafRoute routeKey="facility.calendar" path="/calendar" component={CalendarPage} />
              <LeafRoute routeKey="facility.meetings" path="/meetings" component={MeetingsListPage} />
              <LeafRoute
                routeKey="facility.meeting_attendants"
                path="/meeting_attendants"
                component={MeetingAttendantsListPage}
              />
              <LeafRoute routeKey="System meetings" path="/system_meetings" component={SystemMeetingsListPage} />
              <Route path="/staff">
                <LeafRoute routeKey="facility.staff" path="/" component={StaffListPage} />
                <LeafRoute routeKey="facility.staff_details" path="/:userId" component={StaffDetailsPage} />S
              </Route>
              <Route path="/clients">
                <LeafRoute routeKey="facility.clients" path="/" component={ClientsListPage} />
                <LeafRoute routeKey="facility.client_details" path="/:userId" component={ClientDetailsPage} />
              </Route>
            </Route>
            <Route path="/admin" component={FacilityAdminPages}>
              <UnknownNotFound />
              <LeafRoute routeKey="facility.facility_admin.reports" path="/reports" component={ReportsPage} />
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
  return (
    <Route
      {...routeProps}
      component={(innerProps) => (
        <>
          <MemoRouteTitle routeKey={props.routeKey} />
          <Dynamic component={props.component} {...innerProps} />
        </>
      )}
    />
  );
};

const UnknownNotFound: VoidComponent = () => <Route path="/*" component={NotFound} />;

const GlobalAdminPages: ParentComponent = (props) => (
  <AccessBarrier roles={["globalAdmin"]}>{props.children}</AccessBarrier>
);

const RootPageWithFacility: ParentComponent = (props) => {
  const params = useParams();
  return (
    <RootPage facilityUrl={params.facilityUrl}>
      <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityMember"]}>
        {props.children}
      </AccessBarrier>
    </RootPage>
  );
};

const FacilityAdminPages: ParentComponent = (props) => {
  const params = useParams();
  return (
    <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityAdmin"]}>
      {props.children}
    </AccessBarrier>
  );
};

const FacilityAdminOrStaffPages: ParentComponent = (props) => {
  const params = useParams();
  return (
    <AccessBarrier
      facilityUrl={params.facilityUrl}
      roles={["facilityAdmin"]}
      fallback={() => (
        <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityStaff"]}>
          {props.children}
        </AccessBarrier>
      )}
    >
      {props.children}
    </AccessBarrier>
  );
};
