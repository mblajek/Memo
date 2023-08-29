import { AxiosRequestConfig } from "axios";

export namespace Api {
  /** UUID of an entity. */
  export type Id = string;

  export interface Entity {
    id: Id;
  }

  /** Comma-separated UUIDs. */
  type Ids = string;

  export namespace Request {
    export type Config<D = unknown> = AxiosRequestConfig<D>;
    export type Create<T extends Entity> = Omit<T, "id">;
    export type GetListParams = {in?: Ids};
    export type Patch<T extends Entity> = Partial<Omit<T, "id">>;
  }

  export namespace Response {
    export type Get<T extends object> = {data: T};
    export type GetList<T extends Entity> = {data: T[]};
    export type Post = {data: Entity};
  }

  export type ErrorResponse = {
    errors: Error[];
  };

  export type BaseError = {
    code: string;
    data?: Partial<Record<string, string | string[]>>;
    trace?: unknown;
  };

  export type ValidationError = {
    field: string;
    code: string;
    data?: Partial<Record<string, string | string[]>>;
  };

  export type Error = BaseError | ValidationError;

  export const isValidationError = (error: Error): error is ValidationError => "field" in error;
}
