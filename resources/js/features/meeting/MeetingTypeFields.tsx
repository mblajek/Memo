import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {Position} from "data-access/memo-api/dictionaries";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {VoidComponent} from "solid-js";

export const MeetingTypeFields: VoidComponent = () => {
  const attributes = useAttributes();
  const categoryAttribute = () => attributes()?.getByName<string>("position", "categoryDictId");
  const {meetingCategoryDict} = useFixedDictionaries();
  function isSystemType(pos: Position) {
    return categoryAttribute()?.readFrom(pos.resource) === meetingCategoryDict()?.system.id;
  }
  return (
    <DictionarySelect
      name="typeDictId"
      dictionary="meetingType"
      nullable={false}
      itemFunc={(pos, defItem) => (isSystemType(pos) ? undefined : defItem())}
    />
  );
};
