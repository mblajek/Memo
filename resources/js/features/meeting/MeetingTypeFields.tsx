import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {isDEV} from "components/utils/dev_mode";
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
      itemFunc={(pos, defItem) => {
        if (isSystemType(pos)) {
          if (isDEV()) {
            const def = defItem();
            return {
              ...def,
              label: () => (
                <div class="flex gap-2 justify-between items-baseline">
                  <div>{def.text}</div>
                  <div class="text-xs">DEV</div>
                </div>
              ),
            };
          }
          return undefined;
        }
        return defItem();
      }}
    />
  );
};
