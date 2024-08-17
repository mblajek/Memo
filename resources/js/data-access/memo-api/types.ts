import {AxiosRequestConfig} from "axios";

export namespace Api {
  export const ID_LENGTH = 36;

  /** UUID of an entity. */
  export type Id = string;

  export interface Entity {
    id: Id;
  }

  /** Comma-separated UUIDs. */
  type Ids = string;

  export type Config<D = unknown> = AxiosRequestConfig<D>;

  export namespace Request {
    export type Create<T extends Entity> = Omit<T, "id">;
    export type GetListParams = {in?: Ids};
    export type Patch<T extends Entity> = Entity & Partial<T>;
  }

  export namespace Response {
    export type Get<T extends object> = {data: T};
    export type GetList<T extends Entity> = {data: T[]};
    export type Post<T = Entity> = {data: T};
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

/**
 * A type with all fields converted to optional and nullable. This might be useful to construct
 * form types from resource types, as in a form it is valid to have an empty value even if it is
 * required in the type, and rely on the backend validation.
 */
export type PartialNullable<T> = {
  [K in keyof T]?: T[K] | null;
};

/** A type with the effect of PartialNullable undone. */
export type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};
