import {activeFacilityId} from "state/activeFacilityId.state";

export namespace FacilityNotification {
  export const keys = {
    notification: () => ["facility", "notification"] as const,
    notificationList: () => [...keys.notification(), "list", activeFacilityId()] as const,
  };
}
