import {CreatedUpdatedResource} from "./resource";

/**
 * @see `/app/Http/Resources/UserResource.php`
 */
export interface UserResource extends CreatedUpdatedResource {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly hasEmailVerified: boolean;
  readonly hasPassword: boolean;
  readonly passwordExpireAt: string | null;
  readonly otpRequiredAt: string | null;
  readonly hasOtpConfigured: boolean;
  readonly lastLoginFacilityId: string | null;
  readonly managedByFacilityId: string | null;
}
