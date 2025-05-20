import {AxiosHeaders, AxiosInstance} from "axios";

const HEADER_REQUEST = "X-CSRF-TOKEN";
const HEADER_RESPONSE = "X-SET-CSRF-TOKEN";

export function installCSRFHandler(instance: AxiosInstance) {
  let xsrfToken: string | undefined;
  instance.interceptors.response.use((value) => {
    const header = value.headers instanceof AxiosHeaders && value.headers.get(HEADER_RESPONSE);
    if (header && typeof header === "string") {
      xsrfToken = header;
    }
    return value;
  });
  instance.interceptors.request.use((value) => {
    if (xsrfToken) {
      value.headers.set(HEADER_REQUEST, xsrfToken);
    }
    return value;
  });
}
