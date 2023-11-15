import {Outlet} from "@solidjs/router";
import {Confirmation} from "components/ui/Confirmation";
import {AccessBarrier} from "components/utils";
import {ParentComponent, mergeProps} from "solid-js";
import {Container} from "../layout/Container";
import {Footer} from "../layout/Footer";
import {Header} from "../layout/Header";
import {Main} from "../layout/Main";
import {Navbar} from "../layout/Navbar";

interface Props {
  readonly facilityUrl?: string;
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
