import axios, {AxiosError} from "axios";
import {Api, isJSON} from "../types";

export const V1 = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 30_000,
});

type UnknownData = Partial<Record<string, unknown>>;

function asUnknownData(data: unknown): UnknownData | undefined {
  return data && typeof data === "object" ? data : undefined;
}

const UNEXPECTED_ERROR_DATA = {errors: [{code: "exception.unexpected"}]} satisfies Api.ErrorResponse;

export interface OriginalResponseForUnexpectedError {
  readonly contentType?: string;
  readonly data: unknown;
}

export function getOriginalResponseForUnexpectedError(
  data: Api.ErrorResponse,
): OriginalResponseForUnexpectedError | undefined {
  return (data as unknown as UnknownData).original as OriginalResponseForUnexpectedError;
}

V1.interceptors.request.use((value) => {
  const data = value.data;
  if (!isJSON(data, true)) {
    console.error("Bad request to backend, expected JSON, got:", data);
    throw new Error("Bad request to backend, expected JSON");
  }
  return value;
});

V1.interceptors.response.use(
  (value) => {
    const data = value.data;
    if (!isJSON(data)) {
      console.error("Bad response from backend, expected JSON, got:", data);
      throw new Error("Bad response from backend, expected JSON");
    }
    return value;
  },
  (error: AxiosError) => {
    const {response} = error;
    if (response) {
      const {headers, data} = response;
      const isWellFormed = Array.isArray(asUnknownData(data)?.errors);
      if ((response.status >= 500 && response.status < 600) || !isWellFormed)
        console.error("Bad response from backend:", JSON.stringify(asUnknownData(data)?.message || data), error);
      if (!isWellFormed) {
        const unknownData = asUnknownData(data);
        if (unknownData) {
          unknownData.errors = [...UNEXPECTED_ERROR_DATA.errors];
        } else {
          response.data = {
            ...UNEXPECTED_ERROR_DATA,
            original: {
              contentType: String(
                typeof headers.getContentType === "function" ? headers.getContentType() : headers.getContentType,
              ),
              data: response.data,
            } satisfies OriginalResponseForUnexpectedError,
          };
        }
      }
    }
    return Promise.reject(error);
  },
);
