/**
 * @see `/app/Http/Resources/PermissionResource.php`
 */
export interface PermissionsResource {
  readonly userId: string;
  readonly facilityId: string;
  readonly verified: boolean;
  readonly globalAdmin: boolean;
  readonly facilityMember: boolean;
  readonly facilityClient: boolean;
  readonly facilityStaff: boolean;
  readonly facilityAdmin: boolean;
  readonly developer: boolean;
}
