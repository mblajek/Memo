import { Outlet } from "@solidjs/router";
import { Footer, Header, Navbar } from "components/layout/dashboard";
import { Page } from "components/utils";
import { type Component } from "solid-js";

const DashboardPage: Component = () => {
  return (
    <Page title="Panel użytkownika">
      <div class="min-h-screen max-h-screen flex flex-row bg-gray-200 overflow-hidden">
        <Navbar />
        <div class="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main class="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </Page>
  );
};

export default DashboardPage;
