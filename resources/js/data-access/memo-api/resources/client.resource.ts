import {AttributableMarker} from "../attributable";
import {CreatedUpdatedResource} from "./resource";
import {UserResource} from "./user.resource";

export interface ClientResource extends UserResource {
  readonly client: CreatedUpdatedResource & ClientSpecificFields;
}

export const SHORT_CODE_EMPTY = "-";

interface ClientSpecificFields extends AttributableMarker<"client"> {}

export type ClientResourceForCreate = Pick<ClientResource, "id" | "name"> & {
  readonly client: ClientSpecificFields;
};

export type ClientResourceForPatch = Pick<ClientResource, "id"> &
  Partial<Pick<ClientResource, "name">> & {
    readonly client: Partial<ClientSpecificFields>;
  };
