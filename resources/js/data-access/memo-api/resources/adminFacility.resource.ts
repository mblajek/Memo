export interface AdminFacilityResource {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly meetingNotificationTemplateSubject: string | null;
}

export type AdminFacilityResourceForCreate = AdminFacilityResource;
