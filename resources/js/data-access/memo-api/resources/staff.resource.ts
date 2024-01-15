import {UserResource} from "./user.resource";

export interface StaffResource extends UserResource {
  readonly client: StaffSpecificFields;
}

interface StaffSpecificFields {}
