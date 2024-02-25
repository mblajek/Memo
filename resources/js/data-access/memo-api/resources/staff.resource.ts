import {UserResource} from "./user.resource";

export interface StaffResource extends UserResource {
  readonly staff: StaffSpecificFields;
}

interface StaffSpecificFields {
  readonly hasFacilityAdmin: boolean;
}
