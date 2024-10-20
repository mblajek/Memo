import {DelegatedEvents} from "solid-js/web";

declare module "solid-js" {
  namespace JSX {
    interface CustomEvents extends HTMLElementEventMap {}
    interface ExplicitBoolAttributes {
      // TODO: Switch inert to bool:inert attributes in the code when Solid types are fixed
      // (https://github.com/ryansolid/dom-expressions/pull/368)
      inert: boolean | undefined;
    }
  }
}

// Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
DelegatedEvents.clear();
