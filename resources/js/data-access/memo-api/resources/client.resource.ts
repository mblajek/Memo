import {UserResource} from "./user.resource";

export interface ClientResource extends UserResource {
  readonly client: ClientSpecificFields;
}

interface ClientSpecificFields {}
