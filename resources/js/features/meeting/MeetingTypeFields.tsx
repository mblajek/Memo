import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {VoidComponent} from "solid-js";

/**
 * Selection of meeting type.
 *
 * TODO: This is currently a simple dictionary field, but UI could theoretically be improved, e.g.
 * by including another select for category that filters the types, or by adding sections/headers
 * in the dropdown of the types select.
 */
export const MeetingTypeFields: VoidComponent = () => (
  <DictionarySelect name="typeDictId" dictionary="meetingType" nullable={false} />
);
