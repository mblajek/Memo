/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Facility%20staff production docs}
 * @see {@link http://localhost:9081/api/documentation#/Facility%20staff local docs}
 */
export namespace FacilityStaff {
  export const keys = {
    staff: () => ["staff"] as const,
  };
}
