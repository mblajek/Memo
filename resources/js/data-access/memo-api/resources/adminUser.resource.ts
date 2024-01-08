import {MemberResource} from "./member.resource";

/**
 * @see `/app/Http/Resources/Admin/AdminUserResource.php`
 */
export interface AdminUserResource {
  /**
   * admin user identifier
   * @type {string(uuid)}
   * @example '67da972b-34d7-4f89-b8ae-322d96b4954d'
   */
  readonly id: string;
  /**
   * admin user full name
   * @type {string}
   */
  readonly name: string;
  /**
   * email address
   * @type {string}
   * @example 'test@test.pl'
   */
  readonly email: string | null;
  /**
   * facility identifier where the user was last logged in
   * @type {string(uuid)}
   * @example '67da972b-34d7-4f89-b8ae-322d96b4954d'
   */
  readonly lastLoginFacilityId: string | null;
  readonly passwordExpireAt: string | null;
  readonly hasPassword: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly hasEmailVerified: boolean;
  /**
   * identifier of a user who created this user
   * @type {string(uuid)}
   * @example '67da972b-34d7-4f89-b8ae-322d96b4954d'
   */
  readonly createdBy: string;
  readonly hasGlobalAdmin: boolean;
  /**
   * array of members
   * @type {MemberResource[]}
   */
  readonly members: readonly MemberResource[];
}

/** The user resource used for creation. */
export type AdminUserResourceForCreate = Pick<
  AdminUserResource,
  "name" | "email" | "hasEmailVerified" | "passwordExpireAt" | "hasGlobalAdmin"
> & {readonly password: string | null};
