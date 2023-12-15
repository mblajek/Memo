/**
 * @see `/app/Http/Resources/MemeberResource.php`
 */
export interface MemberResource {
  readonly id: string;
  readonly userId: string;
  readonly facilityId: string;
  readonly hasFacilityAdmin: boolean;
  readonly staffMemberId: string | null;
  readonly clientId: string | null;
}
