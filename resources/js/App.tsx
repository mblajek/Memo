import { lazy, type Component } from "solid-js";
import { Routes, Route, Navigate } from "@solidjs/router";
import { Page } from "./components/utils";

const LoginPage = lazy(() => import("pages/Login.page"));
const DashboardPage = lazy(() => import("pages/Dashboard.page"));

const App: Component = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate href="/dashboard" />} />
            <Route path="/login" component={LoginPage} />
            <Route path="/dashboard" component={DashboardPage}>
                <Route
                    path="/calendar"
                    component={() => (
                        <Page title="kalendarz spotkań">
                            <div style={{ height: "4000px" }}>calendar</div>
                        </Page>
                    )}
                />
                <Route path="/schedule" component={() => <Page title="schedule"><div>schedule</div></Page>} />
                <Route path="/users" component={() => <div>users</div>} />
                <Route path="/*" element={<Navigate href="/dashboard" />} />
            </Route>
        </Routes>
    );
};

export default App;
