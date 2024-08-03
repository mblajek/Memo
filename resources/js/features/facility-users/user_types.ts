import {LangFunc} from "components/utils";

export type FacilityUserType = "staff" | "clients";

export function getFacilityUserTypeName(t: LangFunc, type: FacilityUserType) {
  return t(
    type === "staff" ? "models.staff._name" : type === "clients" ? "models.client._name" : (type satisfies never),
  );
}
