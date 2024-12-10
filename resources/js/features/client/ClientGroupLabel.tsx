import {Button} from "components/ui/Button";
import {SmallSpinner} from "components/ui/Spinner";
import {ThingsList} from "components/ui/ThingsList";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {Show, VoidComponent} from "solid-js";
import {useMembersData} from "../facility-users/members_data";
import {createClientGroupViewModal} from "./client_group_view_modal";

interface Props {
  readonly group: ClientGroupResource;
  readonly allowViewGroup?: boolean;
}

export const ClientGroupLabel: VoidComponent<Props> = (props) => {
  const membersData = useMembersData();
  const clientGroupViewModal = createClientGroupViewModal();
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
        style={{"text-decoration-line": "inherit"}}
        things={props.group.clients}
        map={({userId}) => membersData.getById(userId)?.name.split(/\s/, 1)[0]}
        mode="commas"
      />
    );
  };
  return (
    <Show when={props.allowViewGroup} fallback={label()}>
      <Button
        class="text-start hover:underline"
        onClick={() => clientGroupViewModal.show({group: props.group, allowEditing: true, allowDeleting: false})}
      >
        {label()}
      </Button>
    </Show>
  );
};
