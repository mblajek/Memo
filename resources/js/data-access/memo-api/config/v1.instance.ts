import axios from "axios";

export const V1 = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

// if (instanceV1.interceptors) {
//   instanceV1.interceptors.response.use(undefined, (error: AxiosError) => {
//     if (error.status === 401) {
//       const { origin, pathname } = window.location;
//       window.location.href = `${origin}/login?returnUrl=${pathname}`;
//     }
//     return Promise.reject(error);
//   });
// }
