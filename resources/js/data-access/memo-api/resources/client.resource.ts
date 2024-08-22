import {AttributableMarker} from "../attributable";
import {CreatedUpdatedResource} from "./resource";
import {UserResource} from "./user.resource";

export interface ClientResource extends UserResource {
  readonly client: CreatedUpdatedResource & ClientSpecificFields;
}

export const SHORT_CODE_EMPTY = "-";

type ClientSpecificFields = AttributableMarker<"client"> & {
  readonly groupIds: readonly string[] | null;
};

export type ClientResourceForCreate = Pick<ClientResource, "id" | "name"> & {
  readonly client: ClientSpecificFieldsForCreate;
};

export type ClientSpecificFieldsForCreate = Omit<ClientSpecificFields, "groupIds">;

export type ClientResourceForPatch = Pick<ClientResource, "id"> &
  Partial<Pick<ClientResource, "name">> & {
    readonly client: Partial<ClientSpecificFields>;
  };
