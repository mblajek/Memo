export interface CreatedUpdatedResource {
  readonly createdAt: string;
  readonly createdBy: string;
  readonly updatedAt: string;
  // Note: This field is missing on some resources for now.
  readonly updatedBy?: string;
}
