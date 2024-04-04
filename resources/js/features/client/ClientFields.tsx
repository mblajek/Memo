import {AttributeFields} from "components/ui/form/AttributeFields";
import {PartialAttributesSelection} from "components/utils/attributes_selection";
import {VoidComponent} from "solid-js";

interface Props {
  readonly editMode: boolean;
  readonly showAllAttributes?: boolean;
}

const ATTRIBUTES_SELECTION: PartialAttributesSelection = {
  includeFixed: true,
};

/** The client form fields, consisting of fixed and non-fixed attributes, as well as possibly other fields. */
export const ClientFields: VoidComponent<Props> = (props) => {
  return (
    <AttributeFields
      model="client"
      minRequirementLevel={props.showAllAttributes ? undefined : props.editMode ? "optional" : "recommended"}
      nestFieldsUnder="client"
      selection={ATTRIBUTES_SELECTION}
      editMode={props.editMode}
    />
  );
};
