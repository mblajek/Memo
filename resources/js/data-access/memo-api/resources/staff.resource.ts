import {AdminUserResourceForCreate} from "data-access/memo-api/resources/adminUser.resource";
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
  Partial<
    Pick<
      AdminUserResourceForCreate,
      "name" | "email" | "hasEmailVerified" | "hasPassword" | "password" | "passwordExpireAt"
    >
  > & {
    readonly staff: Partial<Pick<StaffSpecificFields, "deactivatedAt">>;
  };
