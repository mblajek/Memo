import {Outlet} from "@solidjs/router";
import {AccessBarrier} from "components/utils";
import {type Component} from "solid-js";
import {Container, Footer, Header, Main, Navbar} from "../layout";

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
      </Container>
    </AccessBarrier>
  );
};

export default RootPage;
