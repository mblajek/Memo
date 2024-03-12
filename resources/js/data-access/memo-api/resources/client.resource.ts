import {AttributableMarker} from "../attributable";
import {UserResource} from "./user.resource";

export interface ClientResource extends UserResource {
  readonly client: ClientSpecificFields;
}

interface ClientSpecificFields extends AttributableMarker<"client"> {}

export type ClientResourceForPatch = Pick<ClientResource, "id" | "client">;
