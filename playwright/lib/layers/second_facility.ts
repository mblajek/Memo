import {createdId} from "../responses.ts";
import {facilityLayer, type FacilityArtifact} from "./facility.ts";

/** Sorts after `FACILITY.name`, which is the order of the header's facility selector. */
export const OTHER_FACILITY = {name: "Integration Test Other Facility", url: "int-test-other"} as const;

export type SecondFacilityArtifact = FacilityArtifact & {
  readonly otherFacilityId: string;
};

/**
 * Adds a second facility, with STAFF_ADMIN as its only member (active staff, not an admin there).
 * The other seeded users stay members of the first facility only.
 */
export const secondFacilityLayer = facilityLayer.createSubLayer<SecondFacilityArtifact>(
  "Second Facility",
  async ({api, parentArtifact}) => {
    const res = await api.createFacility({name: OTHER_FACILITY.name, url: OTHER_FACILITY.url});
    const otherFacilityId = await createdId(res);
    await api.createMember({
      userId: parentArtifact.staffAdminUserId,
      facilityId: otherFacilityId,
      isFacilityStaff: true,
      isActiveFacilityStaff: true,
    });
    return {...parentArtifact, otherFacilityId};
  },
);
