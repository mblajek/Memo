import {MemberResource} from "./member.resource";
import {UserResource} from "./user.resource";

/**
 * @see `/app/Http/Resources/Admin/AdminUserResource.php`
 */
export interface AdminUserResource extends UserResource {
  readonly hasGlobalAdmin: boolean;
  readonly members: readonly MemberResource[];
}

/** The user resource used for creation. */
export type AdminUserResourceForCreate = Pick<
  AdminUserResource,
  "name" | "email" | "hasEmailVerified" | "passwordExpireAt" | "managedByFacilityId" | "hasGlobalAdmin"
> & {readonly password: string | null};
