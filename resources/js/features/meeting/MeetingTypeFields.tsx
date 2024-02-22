import {DefaultDictionarySelectItem, DictionarySelect} from "components/ui/form/DictionarySelect";
import {isDEV} from "components/utils/dev_mode";
import {useAttributes} from "data-access/memo-api/attributes";
import {Position} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {VoidComponent} from "solid-js";

/**
 * Selection of meeting type.
 *
 * The types from the system category are only shown in DEV mode as they are not regular meetings.
 *
 * TODO: This is currently a simple dictionary field, but UI could theoretically be improved, e.g.
 * by including another select for category that filters the types, or by adding sections/headers
 * in the dropdown of the types select.
 */
export const MeetingTypeFields: VoidComponent = () => {
  const attributes = useAttributes();
  const categoryAttribute = () => attributes()?.get("category");
  const {meetingCategoryDict} = useFixedDictionaries();
  function isSystemType(pos: Position) {
    return categoryAttribute()?.readFrom(pos.resource) === meetingCategoryDict()?.system.id;
  }
  function itemFunc(pos: Position, defItem: () => DefaultDictionarySelectItem, dev = false) {
    if (isSystemType(pos)) {
      if (dev) {
        const item = defItem();
        return {
          ...item,
          labelOnList: () => (
            <div class="flex gap-2 items-baseline justify-between">
              <span>{item.text}</span>
              <span class="text-xs">DEV</span>
            </div>
          ),
        };
      }
      return undefined;
    }
    return defItem();
  }
  return (
    <DictionarySelect
      name="typeDictId"
      dictionary="meetingType"
      nullable={false}
      itemFunc={isDEV() ? (pos, defItem) => itemFunc(pos, defItem, true) : (pos, defItem) => itemFunc(pos, defItem)}
    />
  );
};
