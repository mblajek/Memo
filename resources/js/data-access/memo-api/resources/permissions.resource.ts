/**
 * @see `/app/Http/Resources/PermissionResource.php`
 */
export type PermissionsResource = {
  userId: string;
  facilityId: string;
  unverified: boolean;
  verified: boolean;
  globalAdmin: boolean;
  facilityMember: boolean;
  facilityClient: boolean;
  facilityStaff: boolean;
  facilityAdmin: boolean;
};
