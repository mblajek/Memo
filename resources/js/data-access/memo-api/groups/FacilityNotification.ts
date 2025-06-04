import {activeFacilityId} from "state/activeFacilityId.state";

export namespace FacilityNotification {
  export const keys = {
    notification: () => ["facility", "notification"] as const,
    notificationList: () => ["facility", "notification", "list", activeFacilityId()] as const,
  };
}
