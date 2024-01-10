import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {System, User} from "data-access/memo-api/groups";
import {PermissionsResource} from "data-access/memo-api/resources/permissions.resource";
import {BiRegularErrorAlt} from "solid-icons/bi";
import {JSX, ParentComponent, Show, VoidComponent, mergeProps, splitProps} from "solid-js";
import {MemoLoader} from "../ui/MemoLoader";
import {QueryBarrier, QueryBarrierProps} from "./QueryBarrier";

export type PermissionKey = Exclude<keyof PermissionsResource, "userId" | "facilityId">;

export interface AccessBarrierProps extends Pick<QueryBarrierProps, "error" | "pending"> {
  /** Element rendered when access is not granted. */
  readonly fallback?: () => JSX.Element;
  /**
   * Map of roles that user must be granted in order to access this section
   * (logical AND)
   *
   * If not provided, checks for authentication state only
   *
   * @default []
   */
  readonly roles?: readonly PermissionKey[];
  /**
   * FacilityUrl available in params object (useParams)
   */
  readonly facilityUrl?: string;
}

/** The roles for which querying facility permissions is necessary. */
const FACILITY_ROLES = new Set<PermissionKey>(["facilityMember", "facilityClient", "facilityStaff", "facilityAdmin"]);

/**
 * Utility component that checks authentication state and user's permissions.
 * Authorization is calculated as `AND(...props.roles)`.
 * - If not authenticated, redirects to `/login`.
 * - If not authorized, renders Fallback (by default a simple message).
 * - Default Error -> redirect to `/login` page
 * - Default Pending -> `<MemoLoader />`
 */
export const AccessBarrier: ParentComponent<AccessBarrierProps> = (allProps) => {
  const defProps = mergeProps(
    {
      fallback: () => <DefaultFallback />,
      roles: [],
      error: () => <Navigate href="/login" />,
      pending: () => <MemoLoader />,
    },
    allProps,
  );
  const [queryBarrierProps, props] = splitProps(defProps, ["error", "pending"]);
  const needFacilityPermissions = () => props.roles.some((role) => FACILITY_ROLES.has(role));
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
    const facilityId = facilitiesQuery.data?.find(({url}) => url === props.facilityUrl)?.id;
    if (facilityId) {
      return User.statusWithFacilityPermissionsQueryOptions(facilityId);
    }
    return {
      queryKey: ["error"],
      queryFn: () => {
        throw new Error(`Facility with URL ${props.facilityUrl} not found`);
      },
    };
  });
  const accessGranted = () => {
    if (!statusQuery.isSuccess) {
      return false;
    }
    const permissions = statusQuery.data!.permissions as Partial<Record<PermissionKey, boolean>>;
    return props.roles?.every((role) => permissions[role]);
  };
  return (
    <QueryBarrier queries={needFacilityPermissions() ? [facilitiesQuery] : []} {...queryBarrierProps}>
      <QueryBarrier queries={[statusQuery]} {...queryBarrierProps}>
        <Show when={accessGranted()} fallback={props.fallback()}>
          {props.children}
        </Show>
      </QueryBarrier>
    </QueryBarrier>
  );
};

const DefaultFallback: VoidComponent = () => (
  <p class="m-2">
    <BiRegularErrorAlt class="inlineIcon text-red-600" /> Nie masz uprawnień do tego zasobu
  </p>
);

/** An access barrier not showing any pending, error or fallback. */
export const SilentAccessBarrier: ParentComponent<AccessBarrierProps> = (props) => (
  <AccessBarrier error={() => undefined} pending={() => undefined} fallback={() => undefined} {...props} />
);
