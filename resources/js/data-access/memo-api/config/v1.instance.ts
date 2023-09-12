import axios, {AxiosError} from "axios";
import {Api} from "../types";

export const V1 = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

type UnknownData = Partial<Record<string, unknown>>;

function asUnknownData(data: unknown): UnknownData | undefined {
  return data && typeof data === "object" ? data : undefined;
}

const UNEXPECTED_ERROR_DATA = {errors: [{code: "exception.unexpected"}]} satisfies Api.ErrorResponse;

V1.interceptors.response.use(undefined, (error: AxiosError) => {
  const {response} = error;
  if (response) {
    const {data} = response;
    const isWellFormed = Array.isArray(asUnknownData(data)?.errors);
    if ((response.status >= 500 && response.status < 600) || !isWellFormed)
      console.error("Bad response from backend:", JSON.stringify(asUnknownData(data)?.message || data), error);
    if (!isWellFormed) {
      const unknownData = asUnknownData(data);
      if (unknownData) {
        unknownData.errors = UNEXPECTED_ERROR_DATA.errors;
      } else {
        response.data = UNEXPECTED_ERROR_DATA;
      }
    }
  }
  return Promise.reject(error);
});
