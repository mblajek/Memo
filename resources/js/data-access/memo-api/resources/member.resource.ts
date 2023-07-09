/**
 * @see `/app/Http/Resources/MemebrResource.php`
 */
export type MemberResource = {
  userId: string;
  facilityId: string;
  hasFacilityAdmin: boolean;
  /**
   */
  staffMemberId: string | null;
  clientId: string | null;
};
