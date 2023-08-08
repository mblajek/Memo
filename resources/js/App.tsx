import {A, Navigate, Route, Routes} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {System} from "data-access/memo-api";
import {lazy, type Component} from "solid-js";

const RootPage = lazy(() => import("features/root/pages/Root.page"));
const LoginPage = lazy(
  () => import("features/authentication/pages/Login.page")
);
const AdminUsersList = lazy(() => import("features/root/pages/AdminUsersList.page"));

const App: Component = () => {
  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions);

  return (
    <Routes>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={RootPage}>
        <Route path="/" element={<Navigate href="/help" />} />
        <Route path="admin">
          <Route path="/"
            element={<div class="p-4">
              <h2>panel admina globalnego</h2>
              <p>
                <A href="/admin/users" class="text-blue-500 underline">
                  Lista użytkowników
                </A>
              </p>
            </div>}
          />
          <Route path="users" component={AdminUsersList} />
        </Route>
        <Route path="help" element={<div class="p-4">pomoc</div>} />
        <Route
          path=":facilityUrl"
          matchFilters={{
            facilityUrl: facilitiesQuery.data?.map(({url}) => url),
          }}
        >
          <Route path="/" element={<div class="p-4">strona główna placówki</div>} />
          <Route path="admin" element={<div class="p-4">panel admina placówki</div>} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
