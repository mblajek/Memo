import {Outlet} from "@solidjs/router";
import {AccessBarrier} from "components/utils";
import {type Component} from "solid-js";
import {Container, Footer, Header, Main, Navbar} from "../layout";
import {Confirmation} from "components/ui";

const RootPage: Component = () => {
  return (
    <AccessBarrier>
      <Container>
        <Navbar />
        <Header />
        <Main>
          <Outlet />
        </Main>
        <Footer />
        <Confirmation />
      </Container>
    </AccessBarrier>
  );
};

export default RootPage;
