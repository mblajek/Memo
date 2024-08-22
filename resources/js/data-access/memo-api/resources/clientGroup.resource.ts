import {CreatedUpdatedResource} from "./resource";

export interface ClientGroupResource extends CreatedUpdatedResource {
  readonly id: string;
  readonly clients: readonly ClientGroupClientResource[];
  readonly notes: string | null;
  readonly meetingCount: number;
}

export interface ClientGroupClientResource {
  readonly userId: string;
  readonly role: string | null;
}

export interface ClientGroupResourceForCreate extends Pick<ClientGroupResource, "id" | "clients" | "notes"> {}
