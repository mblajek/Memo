import { type AxiosResponse } from "axios";
import { Api } from "./types";

export const parseGetResponse = <T extends object>(
  res: AxiosResponse<Api.Response.Get<T>>,
) => res.data.data;

export const parseGetListResponse = <T extends object>(
  res: AxiosResponse<Api.Response.GetList<T>>,
) => res.data.data;

export const parsePostResponse = (res: AxiosResponse<Api.Response.Post>) =>
  res.data.data;
