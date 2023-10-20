import {Navigate, Outlet, Route, Routes, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AccessBarrier} from "components/utils";
import {System} from "data-access/memo-api/groups";
import {NotFound, NotYetImplemented} from "features/not-found/components";
import {lazy, type VoidComponent} from "solid-js";

const RootPage = lazy(() => import("features/root/pages/Root.page"));
const LoginPage = lazy(() => import("features/authentication/pages/Login.page"));
const AdminUsersListPage = lazy(() => import("features/root/pages/AdminUsersList.page"));
const AdminFacilitiesListPage = lazy(() => import("features/root/pages/AdminFacilitiesList.page"));
const CalendarPage = lazy(() => import("features/root/pages/Calendar.page"));

const App: VoidComponent = () => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  return (
    <Routes>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={RootPage}>
        <UnknownNotFound />
        <Route path="/help" component={NotYetImplemented} />
        <Route path="/admin" component={GlobalAdminPages}>
          <UnknownNotFound />
          <Route path="/facilities" component={AdminFacilitiesListPage} />
          <Route path="/users" component={AdminUsersListPage} />
        </Route>
      </Route>
      <Route
        path="/:facilityUrl"
        matchFilters={{facilityUrl: facilitiesQuery.data?.map(({url}) => url) || []}}
        component={RootPageWithFacility}
      >
        <UnknownNotFound />
        <Route path="/" element={<Navigate href="home" />} />
        <Route path="/home" component={NotYetImplemented} />
        <Route path="/meetings" component={NotYetImplemented} />
        <Route path="/" component={FacilityStaffPages}>
          <Route path="/calendar" component={NotYetImplemented} />
          <Route path="/timetable" component={NotYetImplemented} />
          <Route path="/clients" component={NotYetImplemented} />
        </Route>
        <Route path="/admin" component={FacilityAdminPages}>
          <UnknownNotFound />
          {/* This is a temporary location for the calendar. */}
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/clients" component={NotYetImplemented} />
          <Route path="/staff" component={NotYetImplemented} />
          <Route path="/reports" component={NotYetImplemented} />
        </Route>
      </Route>
    </Routes>
  );
};
export default App;

const UnknownNotFound: VoidComponent = () => <Route path="/*" component={NotFound} />;

const GlobalAdminPages: VoidComponent = () => (
  <AccessBarrier roles={["globalAdmin"]}>
    <Outlet />
  </AccessBarrier>
);

const RootPageWithFacility: VoidComponent = () => {
  const params = useParams();
  return (
    <RootPage facilityUrl={params.facilityUrl}>
      <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityMember"]}>
        <Outlet />
      </AccessBarrier>
    </RootPage>
  );
};

const FacilityStaffPages: VoidComponent = () => {
  const params = useParams();
  return (
    <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityStaff"]}>
      <Outlet />
    </AccessBarrier>
  );
};

const FacilityAdminPages: VoidComponent = () => {
  const params = useParams();
  return (
    <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityAdmin"]}>
      <Outlet />
    </AccessBarrier>
  );
};
