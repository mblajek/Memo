/**
 * @see `/app/Http/Resources/MemeberResource.php`
 */
export type MemberResource = {
  id: string;
  userId: string;
  facilityId: string;
  hasFacilityAdmin: boolean;
  staffMemberId: string | null;
  clientId: string | null;
};
