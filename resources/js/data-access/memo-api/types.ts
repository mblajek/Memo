export namespace Api {
  export namespace Response {
    export type Get<T extends object> = { data: T };
    export type GetList<T extends object> = { data: Array<T> };
    export type Post = { data: { id: string } };
    export type Patch = {};
    export type Delete = {};
  }

  export namespace Request {
    export type GetListParams = {
      in?: string;
    };
  }

  export type ErrorData = {
    errors: Array<ErrorSimple | ErrorWithValidation>;
  };

  export type ErrorSimple = {
    code: string;
    data?: Record<string, string | string[]>;
  };

  export type ErrorWithValidation = {
    code: "exception.validation";
    validation?: Array<ValidationError>;
  };

  export type ValidationError = {
    field?: string;
    code: string;
    data?: Record<string, string | string[]>;
  };
}
