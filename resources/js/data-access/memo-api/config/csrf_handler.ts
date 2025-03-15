import {AxiosHeaders, AxiosInstance} from "axios";

export function installCSRFHandler(instance: AxiosInstance) {
  let xsrfToken: string | undefined;
  instance.interceptors.response.use((value) => {
    const header = value.headers instanceof AxiosHeaders && (value.headers as AxiosHeaders).get("X-SET-CSRF-TOKEN");
    if (header && typeof header === "string") {
      xsrfToken = header;
    }
    return value;
  });
  instance.interceptors.request.use((value) => {
    if (xsrfToken) {
      value.headers.set("X-CSRF-TOKEN", xsrfToken);
    }
    return value;
  });
}
