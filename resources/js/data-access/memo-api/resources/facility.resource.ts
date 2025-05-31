/**
 * @see `/app/Http/Resources/FacilityResource.php`
 */
export interface FacilityResource {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

export type FacilityResourceForCreate = Pick<FacilityResource, "id" | "name" | "url">;
