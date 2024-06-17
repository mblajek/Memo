import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {VoidComponent} from "solid-js";

export const WorkTimeTypeField: VoidComponent = () => {
  const {meetingTypeDict} = useFixedDictionaries();
  return (
    <DictionarySelect
      name="typeDictId"
      dictionary="meetingType"
      nullable={false}
      itemFunc={(pos, defItem) =>
        pos.id === meetingTypeDict()?.work_time.id || pos.id === meetingTypeDict()?.leave_time.id
          ? defItem()
          : undefined
      }
      useGrouping={false}
    />
  );
};
