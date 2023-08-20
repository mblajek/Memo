import { Outlet } from "@solidjs/router";
import { AccessBarrier } from "components/utils";
import { createEffect, type Component } from "solid-js";
import { Container, Footer, Header, Main, Navbar } from "../layout";

const RootPage: Component = () => {
  createEffect(() => console.log("test"));
  return (
    <AccessBarrier>
      <Container>
        <Navbar />
        <Header />
        <Main>
          <Outlet />
        </Main>
        <Footer />
      </Container>
    </AccessBarrier>
  );
};

export default RootPage;
