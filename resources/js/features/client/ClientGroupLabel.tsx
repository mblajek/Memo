import {SmallSpinner} from "components/ui/Spinner";
import {ThingsList} from "components/ui/ThingsList";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {VoidComponent} from "solid-js";
import {useMembersData} from "../facility-users/members_data";

interface Props {
  readonly group: ClientGroupResource;
}

export const ClientGroupLabel: VoidComponent<Props> = (props) => {
  const membersData = useMembersData();
  const label = () => {
    const notesFirstLine = props.group.notes?.split("\n", 1)[0];
    if (notesFirstLine) {
      return notesFirstLine;
    }
    if (membersData.isPending()) {
      return <SmallSpinner />;
    }
    return (
      <ThingsList
        things={props.group.clients}
        map={({userId}) => membersData.getById(userId)?.name.split(/\s/, 1)[0]}
        mode="commas"
      />
    );
  };
  return <>{label()}</>;
};
