import {AttributeFields} from "components/ui/form/AttributeFields";
import {VoidComponent} from "solid-js";

interface Props {
  readonly editMode: boolean;
  readonly showAllAttributes?: boolean;
}

const FIXED_ATTRIBUTES = [
  "typeDictId",
  "genderDictId",
  "birthDate",
  "addressStreetNumber",
  "addressPostalCode",
  "addressCity",
  "contactEmail",
  "contactPhone",
  "documentsLinks",
  "notes",
  "notificationMethodDictIds",
  "contactStartAt",
  "contactEndAt",
];

/** The client form fields, consisting of fixed and non-fixed attributes, as well as possibly other fields. */
export const ClientFields: VoidComponent<Props> = (props) => {
  return (
    <AttributeFields
      model="client"
      minRequirementLevel={props.showAllAttributes ? undefined : props.editMode ? "optional" : "recommended"}
      nestFieldsUnder="client"
      includeFixedAttributes={FIXED_ATTRIBUTES}
      editMode={props.editMode}
    />
  );
};
