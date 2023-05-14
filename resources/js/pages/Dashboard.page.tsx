import { Outlet } from "@solidjs/router";
import { type Component } from "solid-js";
import { Navbar, Header, Footer } from "components/layout/dashboard";
import { Page } from "components/utils";

const DashboardPage: Component = () => {
    return (<Page title="Panel użytkownika">
        <div class="min-h-screen max-h-screen flex flex-row bg-gray-200 overflow-hidden">
            <Navbar />
            <div class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
                <Header />
                <main class="flex-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </div>
    </Page>
    );
};

export default DashboardPage;
