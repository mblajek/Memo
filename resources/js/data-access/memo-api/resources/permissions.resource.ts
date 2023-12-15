/**
 * @see `/app/Http/Resources/PermissionResource.php`
 */
export type PermissionsResource = {
  readonly userId: string;
  readonly facilityId: string;
  readonly unverified: boolean;
  readonly verified: boolean;
  readonly globalAdmin: boolean;
  readonly facilityMember: boolean;
  readonly facilityClient: boolean;
  readonly facilityStaff: boolean;
  readonly facilityAdmin: boolean;
};
