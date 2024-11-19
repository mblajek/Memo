import {DelegatedEvents} from "solid-js/web";

declare module "solid-js" {
  namespace JSX {
    interface ExplicitBoolAttributes {
      inert: boolean | undefined;
    }
  }
}

// Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
DelegatedEvents.clear();
