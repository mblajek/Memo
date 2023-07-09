export namespace Api {
  export namespace Response {
    export type Get<T extends object> = { data: T };
    export type GetList<T extends object> = { data: Array<T> };
    export type Post = { data: { id: string } };
    export type Patch = unknown;
    export type Delete = unknown;
  }

  export namespace Request {
    export type GetListParams = {
      in?: string;
    };
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

  export const isValidationError = (error: Error): error is ValidationError =>
    "field" in error;
}
