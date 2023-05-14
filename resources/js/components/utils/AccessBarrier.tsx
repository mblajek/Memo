import { NavigateProps } from "@solidjs/router";
import { ParentComponent } from "solid-js";

export type Role = "ROLE";

export interface AccessBarrierProps {
  authenticated: boolean;
  roles: Role[];
  redirectHref: NavigateProps["href"];
}

export const AccessBarrier: ParentComponent<AccessBarrierProps> = (props) => {
  return <>{props.children}</>;
  // return <Navigate href={props.redirectHref} />
  // return <>

  // </>
};
