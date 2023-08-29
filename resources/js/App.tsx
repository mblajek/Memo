import {A, Navigate, Outlet, Route, Routes, useParams, useRoutes} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {AccessBarrier, Page, QueryBarrier} from "components/utils";
import {FacilityResource, System} from "data-access/memo-api";
import {lazy, type Component} from "solid-js";

const RootPage = lazy(() => import("features/root/pages/Root.page"));
const LoginPage = lazy(() => import("features/authentication/pages/Login.page"));
const AdminUsersList = lazy(() => import("features/root/pages/AdminUsersList.page"));

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
          element: <div>Nie znaleziono strony</div>,
        },
        {
          path: "/help",
          component: () => (
            <Page title="Pomoc">
              <div class="p-4">pomoc</div>
            </Page>
          ),
        },
        {
          path: "/admin",
          component: () => {
            return (
              <AccessBarrier>
                <Outlet />
              </AccessBarrier>
            );
          },
          children: [
            {
              path: "/*",
              element: <div>Nie znaleziono strony (globalny admin)</div>,
            },
            {
              path: "/facilities",
              element: <div>Placówki (globalny admin)</div>,
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
            facilityUrl: facilities?.map(({ url }) => url),
          },
          component: () => {
            const params = useParams();
            return (
              <AccessBarrier
                facilityUrl={params.facilityUrl}
                roles={["facilityMember"]}
              >
                <Outlet />
              </AccessBarrier>
            );
          },
          children: [
            {
              path: "/*",
              element: <div>Nie znaleziono strony (placówka)</div>,
            },
            {
              path: "/",
              element: <div class="p-4">strona główna placówki</div>,
            },
            {
              path: "/calendar",
              element: <div class="p-4">Mój kalendarz (placówka)</div>,
            },
            {
              path: "/timetable",
              element: <div class="p-4">Mój harmonogram (placówka)</div>,
            },
            {
              path: "/clients",
              element: <div class="p-4">Moi klienci (placówka)</div>,
            },
            {
              path: "/admin",
              component: () => {
                const params = useParams();
                return (
                  <AccessBarrier
                    facilityUrl={params.facilityUrl}
                    roles={["facilityAdmin"]}
                  >
                    <Outlet />
                  </AccessBarrier>
                );
              },
              children: [
                {
                  path: "/*",
                  element: <div>Nie znaleziono strony (admin placówki)</div>,
                },
                {
                  path: "/calendar",
                  element: <div>Kalendarz (admin placówki)</div>,
                },
                {
                  path: "/clients",
                  element: <div>Klienci (admin placówki)</div>,
                },
                {
                  path: "/staff",
                  element: <div>Pracownicy (admin placówki)</div>,
                },
                {
                  path: "/reports",
                  element: <div>Raporty (admin placówki)</div>,
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
  )
};

export default App;
