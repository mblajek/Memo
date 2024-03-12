import {AttributableMarker} from "../attributable";
import {UserResource} from "./user.resource";

export interface StaffResource extends UserResource {
  readonly staff: StaffSpecificFields;
}

interface StaffSpecificFields extends AttributableMarker<"staff"> {
  readonly hasFacilityAdmin: boolean;
}
