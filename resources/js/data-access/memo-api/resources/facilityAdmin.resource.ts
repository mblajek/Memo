import {AdminUserResourceForCreate} from "data-access/memo-api/resources/adminUser.resource";
import {CreatedUpdatedResource} from "./resource";
import {UserResource} from "./user.resource";

export interface FacilityAdminResource extends UserResource {
  readonly member: CreatedUpdatedResource & FacilityAdminSpecificFields;
}

interface FacilityAdminSpecificFields {
  readonly hasFacilityAdmin: boolean;
}

export type FacilityAdminResourceForPatch = Pick<FacilityAdminResource, "id"> &
  Partial<
    Pick<
      AdminUserResourceForCreate,
      "name" | "email" | "hasEmailVerified" | "hasPassword" | "password" | "passwordExpireAt"
    >
  > & {
    member?: Partial<FacilityAdminSpecificFields>;
  };
