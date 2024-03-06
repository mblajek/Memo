/**
 * @see `/app/Http/Resources/MemeberResource.php`
 */
export interface MemberResource {
  readonly id: string;
  readonly userId: string;
  readonly facilityId: string;
  readonly hasFacilityAdmin: boolean;
  readonly isFacilityStaff: boolean;
  readonly isFacilityClient: boolean;
}
