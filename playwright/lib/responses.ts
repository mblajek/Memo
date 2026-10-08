import {expect, type APIResponse} from "@playwright/test";

interface ApiError {
  readonly field?: string;
  readonly code: string;
}

/**
 * Asserts that the response is a 400 carrying a validation error of the given field and code
 * (e.g. `{field: "name", code: "validation.unique"}`).
 */
export async function expectValidationError(res: APIResponse, expected: ApiError) {
  const text = await res.text();
  expect(res.status(), text).toBe(400);
  const {errors} = JSON.parse(text) as {errors: readonly ApiError[]};
  expect(
    errors.map(({field, code}) => ({field, code})),
    text,
  ).toContainEqual(expected);
}

/**
 * Asserts that the response is a 400 carrying exactly the given validation errors, in any order.
 */
export async function expectValidationErrors(res: APIResponse, expected: readonly ApiError[]) {
  const text = await res.text();
  expect(res.status(), text).toBe(400);
  const {errors} = JSON.parse(text) as {errors: readonly ApiError[]};
  const key = ({field, code}: ApiError) => `${field}: ${code}`;
  expect(
    errors
      .filter(({field}) => field)
      .map(key)
      .toSorted(),
    text,
  ).toEqual(expected.map(key).toSorted());
}

/** The `data` of the response. */
export async function responseData<T>(res: APIResponse): Promise<T> {
  return ((await res.json()) as {data: T}).data;
}

export async function createdId(res: APIResponse): Promise<string> {
  return (await responseData<{id: string}>(res)).id;
}
