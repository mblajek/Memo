import {Users} from "./shared";

export namespace FacilityUsers {
  export const keys = {
    user: () => [...Users.keys.user(), "facility"] as const,
  };
}
