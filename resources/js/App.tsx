import {Navigate, Route, RouteProps, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AccessBarrier} from "components/utils";
import {System} from "data-access/memo-api/groups";
import {DEV, ParentComponent, Show, VoidProps, lazy, splitProps, type VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {BackdoorRoutes} from "./dev-pages/BackdoorRoutes";
import {DevRoutes} from "./dev-pages/DevRoutes";
import {NotFound} from "./features/not-found/components/NotFound";
import {NotYetImplemented} from "./features/not-found/components/NotYetImplemented";
import {MemoTitle} from "./features/root/MemoTitle";

const AdminFacilitiesListPage = lazy(() => import("features/root/pages/AdminFacilitiesList.page"));
const AdminUsersListPage = lazy(() => import("features/root/pages/AdminUsersList.page"));
const CalendarPage = lazy(() => import("features/root/pages/Calendar.page"));
const CalendarTablePage = lazy(() => import("features/root/pages/CalendarTable.page"));
const LoginPage = lazy(() => import("features/authentication/pages/Login.page"));
const RootPage = lazy(() => import("features/root/pages/Root.page"));

const App: VoidComponent = () => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  return (
    <>
      <LeafRoute routeKey="login" path="/login" component={LoginPage} />
      <Route path="/" component={RootPage}>
        <UnknownNotFound />
        <Route path="/" component={() => <Navigate href="/help" />} />
        <Show when={DEV}>
          <DevRoutes />
        </Show>
        <LeafRoute routeKey="help" path="/help" component={NotYetImplemented} />
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
        <LeafRoute routeKey="facility.meetings" path="/meetings" component={NotYetImplemented} />
        <Route path="/" component={FacilityStaffPages}>
          <LeafRoute routeKey="facility.calendar" path="/calendar" component={NotYetImplemented} />
          <LeafRoute routeKey="facility.timetable" path="/timetable" component={NotYetImplemented} />
          <LeafRoute routeKey="facility.clients" path="/clients" component={NotYetImplemented} />
        </Route>
        <Route path="/admin" component={FacilityAdminPages}>
          <UnknownNotFound />
          <LeafRoute routeKey="facility.admin.calendar" path="/calendar" component={CalendarPage} />
          <LeafRoute routeKey="facility.admin.calendar_table" path="/calendar-table" component={CalendarTablePage} />
          <LeafRoute routeKey="facility.admin.clients" path="/clients" component={NotYetImplemented} />
          <LeafRoute routeKey="facility.admin.staff" path="/staff" component={NotYetImplemented} />
          <LeafRoute routeKey="facility.admin.reports" path="/reports" component={NotYetImplemented} />
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

const FacilityStaffPages: ParentComponent = (props) => {
  const params = useParams();
  return (
    <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityStaff"]}>
      {props.children}
    </AccessBarrier>
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
