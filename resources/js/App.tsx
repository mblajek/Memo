import {Navigate, Route, Routes} from "@solidjs/router";
import {QueryBarrier} from "components/utils";
import {System} from "data-access/memo-api";
import {lazy, type Component} from "solid-js";

const RootPage = lazy(() => import("features/root/pages/Root.page"));
const LoginPage = lazy(
  () => import("features/authentication/pages/Login.page")
);
const AdminUsersList = lazy(() => import("features/root/pages/AdminUsersList.page"));

const App: Component = () => {
  const facilitiesQuery = System.useFacilitiesList();

  return (
    <QueryBarrier query={facilitiesQuery}>
      <Routes>
        <Route path="/login" component={LoginPage} />
        <Route path="/" component={RootPage}>
          <Route path="/" element={<Navigate href="/help" />} />
          <Route path="admin">
            <Route path="/"
              element={<>
                <div class="p-4">panel admina globalnego</div>
                <a href="/admin/users">Lista użytkowników</a>
              </>}
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
            <Route
              path="/"
              element={<div class="p-4">strona główna placówki</div>}
            />
            <Route
              path="admin"
              element={<div class="p-4">panel admina placówki</div>}
            />
          </Route>
        </Route>
      </Routes>
    </QueryBarrier>
  );
};

export default App;
