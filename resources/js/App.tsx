import {Outlet, useParams, useRoutes} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AccessBarrier, QueryBarrier} from "components/utils";
import {FacilityResource, System} from "data-access/memo-api";
import {NotFound, NotYetImplemented} from "features/not-found/components";
import {lazy, type Component} from "solid-js";

const RootPage = lazy(() => import("features/root/pages/Root.page"));
const LoginPage = lazy(() => import("features/authentication/pages/Login.page"));
const AdminUsersList = lazy(() => import("features/root/pages/AdminUsersList.page"));
const AdminFacilitiesList = lazy(() => import("features/root/pages/AdminFacilitiesList.page"));

const createRoutes = (facilities?: FacilityResource[]) =>
  useRoutes([
    {
      path: "/login",
      component: LoginPage,
    },
    {
      path: "/",
      component: RootPage,
      children: [
        {
          path: "/*",
          component: NotYetImplemented,
        },
        {
          path: "/help",
          component: NotYetImplemented,
        },
        {
          path: "/admin",
          component: () => {
            return (
              <AccessBarrier roles={["globalAdmin"]}>
                <Outlet />
              </AccessBarrier>
            );
          },
          children: [
            {
              path: "/*",
              component: NotFound,
            },
            {
              path: "/facilities",
              component: AdminFacilitiesList,
            },
            {
              path: "/users",
              component: AdminUsersList,
            },
          ],
        },
        {
          path: "/:facilityUrl",
          matchFilters: {
            facilityUrl: facilities?.map(({url}) => url),
          },
          component: () => {
            const params = useParams();
            return (
              <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityMember"]}>
                <Outlet />
              </AccessBarrier>
            );
          },
          children: [
            {
              path: "/*",
              component: NotFound,
            },
            {
              path: "/home",
              component: NotYetImplemented,
            },
            {
              path: "/meetings",
              component: NotYetImplemented,
            },
            {
              path: "/",
              component: () => {
                const params = useParams();
                return (
                  <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityStaff"]}>
                    <Outlet />
                  </AccessBarrier>
                );
              },
              children: [
                {
                  path: "/calendar",
                  component: NotYetImplemented,
                },
                {
                  path: "/timetable",
                  component: NotYetImplemented,
                },
                {
                  path: "/clients",
                  component: NotYetImplemented,
                },
              ],
            },
            {
              path: "/admin",
              component: () => {
                const params = useParams();
                return (
                  <AccessBarrier facilityUrl={params.facilityUrl} roles={["facilityAdmin"]}>
                    <Outlet />
                  </AccessBarrier>
                );
              },
              children: [
                {
                  path: "/*",
                  component: NotFound,
                },
                {
                  path: "/calendar",
                  component: NotYetImplemented,
                },
                {
                  path: "/clients",
                  component: NotYetImplemented,
                },
                {
                  path: "/staff",
                  component: NotYetImplemented,
                },
                {
                  path: "/reports",
                  component: NotYetImplemented,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

const App: Component = () => {
  const facilities = createQuery(() => System.facilitiesQueryOptions());

  const Routes = createRoutes(facilities.data);

  return (
    <QueryBarrier queries={[facilities]}>
      <Routes />
    </QueryBarrier>
  );
};

export default App;
