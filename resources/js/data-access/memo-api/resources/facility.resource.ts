/**
 * @see `/app/Http/Resources/FacilityResource.php`
 */
export interface FacilityResource {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly hasMeetingNotification: boolean;
  /** A short hash of the facility's icon, null if the facility has no icon. */
  readonly iconHash: string | null;
}
