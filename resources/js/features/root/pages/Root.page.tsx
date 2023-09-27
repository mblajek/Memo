import {Outlet} from "@solidjs/router";
import {Confirmation} from "components/ui";
import {AccessBarrier} from "components/utils";
import {type VoidComponent} from "solid-js";
import {Container, Footer, Header, Main, Navbar} from "../layout";

const RootPage: VoidComponent = () => {
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
