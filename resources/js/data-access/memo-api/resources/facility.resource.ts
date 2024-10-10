/**
 * @see `/app/Http/Resources/FacilityResource.php`
 */
export interface FacilityResource {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  /** The name of the time zone of the facility, e.g. "Europe/Warsaw". */
  readonly timezone: string;
}

export type FacilityResourceForCreate = Pick<FacilityResource, "id" | "name" | "url">;
