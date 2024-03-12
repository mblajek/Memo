import {AttributableMarker} from "../attributable";
import {CreatedUpdatedResource} from "./resource";
import {UserResource} from "./user.resource";

export interface StaffResource extends UserResource {
  readonly staff: CreatedUpdatedResource & StaffSpecificFields;
}

interface StaffSpecificFields extends AttributableMarker<"staff"> {
  readonly hasFacilityAdmin: boolean;
}
