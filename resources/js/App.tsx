import {Navigate, Route, RouteProps, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AccessBarrier} from "components/utils";
import {System} from "data-access/memo-api/groups";
import {DEV, ParentComponent, Show, VoidProps, lazy, splitProps, type VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {BackdoorRoutes} from "./dev-pages/BackdoorRoutes";
import {DevRoutes} from "./dev-pages/DevRoutes";
import NotFound from "./features/not-found/components/NotFound";
import NotYetImplemented from "./features/not-found/components/NotYetImplemented";
import {MemoTitle} from "./features/root/MemoTitle";
import {PageWithTheme} from "./features/root/components/theme_control";

const AdminFacilitiesListPage = lazy(() => import("features/root/pages/AdminFacilitiesList.page"));
const AdminUsersListPage = lazy(() => import("features/root/pages/AdminUsersList.page"));
const CalendarPage = lazy(() => import("features/root/pages/Calendar.page"));
const ClientDetailsPage = lazy(() => import("features/root/pages/ClientDetails.page"));
const ClientsListPage = lazy(() => import("features/root/pages/ClientsList.page"));
const LoginPage = lazy(() => import("features/authentication/pages/Login.page"));
const MeetingsListPage = lazy(() => import("features/root/pages/MeetingsList.page"));
const RootPage = lazy(() => import("features/root/pages/Root.page"));
const StaffDetailsPage = lazy(() => import("features/root/pages/StaffDetails.page"));
const StaffListPage = lazy(() => import("features/root/pages/StaffList.page"));
const StatusPage = lazy(() => import("features/root/pages/help/Status.page"));

const App: VoidComponent = () => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  return (
    <>
      <Route path="/" component={PageWithTheme}>
        <LeafRoute routeKey="login" path="/login" component={LoginPage} />
        <Route path="/" component={RootPage}>
          <UnknownNotFound />
          <Route path="/" component={() => <Navigate href="/help" />} />
          <Show when={DEV}>
            <DevRoutes />
          </Show>
          <Route path="/help">
            <UnknownNotFound />
            <LeafRoute routeKey="help" path="/" component={NotYetImplemented} />
            <LeafRoute routeKey="help_pages.status" path="/status" component={StatusPage} />
          </Route>
          <Route path="/admin" component={GlobalAdminPages}>
            <UnknownNotFound />
            <LeafRoute routeKey="admin.facilities" path="/facilities" component={AdminFacilitiesListPage} />
            <LeafRoute routeKey="admin.users" path="/users" component={AdminUsersListPage} />
          </Route>
        </Route>
        <Route
          path="/:facilityUrl"
          matchFilters={{facilityUrl: facilitiesQuery.data?.map(({url}) => url) || []}}
          component={RootPageWithFacility}
        >
          <UnknownNotFound />
          <Route path="/" component={() => <Navigate href="home" />} />
          <LeafRoute routeKey="facility.home" path="/home" component={NotYetImplemented} />
          <Route path="/" component={FacilityAdminOrStaffPages}>
            <Route path="/calendar">
              <LeafRoute routeKey="facility.calendar" path="/" component={CalendarPage} />
              <LeafRoute routeKey="facility.meetings_list" path="/table" component={MeetingsListPage} />
            </Route>
            <Route path="/staff">
              <LeafRoute routeKey="facility.staff" path="/" component={StaffListPage} />
              <LeafRoute routeKey="facility.staff_details" path="/:userId" component={StaffDetailsPage} />
            </Route>
            <Route path="/clients">
              <LeafRoute routeKey="facility.clients" path="/" component={ClientsListPage} />
              <LeafRoute routeKey="facility.client_details" path="/:userId" component={ClientDetailsPage} />
            </Route>
          </Route>
          <Route path="/admin" component={FacilityAdminPages}>
            <UnknownNotFound />
            <LeafRoute routeKey="facility.facility_admin.reports" path="/reports" component={NotYetImplemented} />
          </Route>
        </Route>
      </Route>
      <BackdoorRoutes />
    </>
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
          <MemoTitle routeKey={props.routeKey} />
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
