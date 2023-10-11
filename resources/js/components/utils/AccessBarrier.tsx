import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {PermissionsResource, System, User} from "data-access/memo-api";
import {ParentComponent, Show, VoidComponent, mergeProps, splitProps} from "solid-js";
import {MemoLoader} from "../ui/";
import {QueryBarrier, QueryBarrierProps} from "./QueryBarrier";

export type PermissionKey = Exclude<keyof PermissionsResource, "userId" | "facilityId">;

export interface AccessBarrierProps extends Pick<QueryBarrierProps, "Error" | "Pending"> {
  /**
   * Component rendered when access is not granted
   */
  Fallback?: VoidComponent;
  /**
   * Map of roles that user must be granted in order to access this section
   * (logical AND)
   *
   * If not provided, checks for authentication state only
   *
   * @default []
   */
  roles?: PermissionKey[];
  /**
   * FacilityUrl available in params object (useParams)
   */
  facilityUrl?: string;
}

/** The roles for which querying facility permissions is necessary. */
const FACILITY_ROLES = new Set<PermissionKey>(["facilityMember", "facilityClient", "facilityStaff", "facilityAdmin"]);

/**
 * Utility component that checks authentication
 * state and user's permissions
 *
 * If not authenticated, redirects to `/login`
 *
 * If not authorized, renders Fallback (by default some simple reference)
 *
 * Authorization is calculated as `AND(...props.roles)`
 *
 * Default Error -> redirect to `/login` page
 *
 * Default Pending -> `<MemoLoader />`
 */
export const AccessBarrier: ParentComponent<AccessBarrierProps> = (props) => {
  const merged = mergeProps(
    {
      Fallback: () => <p>Nie masz uprawnień do tego zasobu</p>,
      roles: [],
      Error: () => <Navigate href="/login" />,
      Pending: MemoLoader,
    },
    props,
  );
  const [queryBarrierProps, localProps] = splitProps(merged, ["Error", "Pending"]);
  const needFacilityPermissions = () => localProps.roles.some((role) => FACILITY_ROLES.has(role));
  // Create the query even if it's not needed, it is fetched on all pages anyway.
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const statusQuery = createQuery(() => {
    // Only load the facility permissions if they are actually checked.
    if (!needFacilityPermissions()) {
      return User.statusQueryOptions();
    }
    if (!facilitiesQuery.isSuccess) {
      // Return a pending query, waiting for the facilities to resolve or appear.
      // If the status is error, the outer QueryBarrier will show the error.
      return {enabled: false, queryKey: ["pending"]};
    }
    const facilityId = facilitiesQuery.data?.find(({url}) => url === localProps.facilityUrl)?.id;
    if (facilityId) {
      return User.statusWithFacilityPermissionsQueryOptions(facilityId);
    }
    return {
      queryKey: ["error"],
      queryFn: () => {
        throw new Error(`Facility with URL ${localProps.facilityUrl} not found`);
      },
    };
  });
  const accessGranted = () => {
    if (!statusQuery.isSuccess) {
      return false;
    }
    const permissions = statusQuery.data!.permissions as Partial<Record<PermissionKey, boolean>>;
    return localProps.roles?.every((role) => permissions[role]);
  };
  return (
    <QueryBarrier queries={needFacilityPermissions() ? [facilitiesQuery] : []} {...queryBarrierProps}>
      <QueryBarrier queries={[statusQuery]} {...queryBarrierProps}>
        <Show when={accessGranted()} fallback={<localProps.Fallback />}>
          {merged.children}
        </Show>
      </QueryBarrier>
    </QueryBarrier>
  );
};
