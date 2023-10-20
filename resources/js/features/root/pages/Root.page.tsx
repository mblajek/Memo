import {Outlet} from "@solidjs/router";
import {Confirmation} from "components/ui/Confirmation";
import {AccessBarrier} from "components/utils";
import {ParentComponent, mergeProps} from "solid-js";
import {Container, Footer, Header, Main, Navbar} from "../layout";

interface Props {
  facilityUrl?: string;
}

export default ((allProps) => {
  const props = mergeProps({children: <Outlet />}, allProps);
  return (
    <AccessBarrier facilityUrl={props.facilityUrl}>
      <Container>
        <Navbar />
        <Header />
        <Main>{props.children}</Main>
        <Footer />
        <Confirmation />
      </Container>
    </AccessBarrier>
  );
}) satisfies ParentComponent<Props>;
