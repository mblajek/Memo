import {Outlet} from "@solidjs/router";
import {Confirmation} from "components/ui";
import {AccessBarrier} from "components/utils";
import {ParentComponent, mergeProps} from "solid-js";
import {Container, Footer, Header, Main, Navbar} from "../layout";

interface Props {
  facilityUrl?: string;
}

export default ((props) => {
  const mProps = mergeProps({children: <Outlet />}, props);
  return (
    <AccessBarrier facilityUrl={mProps.facilityUrl}>
      <Container>
        <Navbar />
        <Header />
        <Main>{mProps.children}</Main>
        <Footer />
        <Confirmation />
      </Container>
    </AccessBarrier>
  );
}) satisfies ParentComponent<Props>;
