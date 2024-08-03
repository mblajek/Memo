import {AttributableMarker} from "../attributable";
import {CreatedUpdatedResource} from "./resource";
import {UserResource} from "./user.resource";

export interface StaffResource extends UserResource {
  readonly staff: CreatedUpdatedResource & StaffSpecificFields;
}

interface StaffSpecificFields extends AttributableMarker<"staff"> {
  readonly hasFacilityAdmin: boolean;
  readonly deactivatedAt: string | null;
}

export type StaffResourceForCreate = Pick<StaffResource, "id" | "name"> & {
  readonly staff: Partial<StaffSpecificFields>;
};

export type StaffResourceForPatch = Pick<StaffResource, "id"> &
  Partial<Pick<StaffResource, "name">> & {
    readonly staff: Partial<StaffSpecificFields>;
  };
