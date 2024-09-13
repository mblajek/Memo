import {Show, VoidComponent} from "solid-js";
import {useClientGroupFetcher} from "./client_group_fetcher";
import {ClientGroupLabel} from "./ClientGroupLabel";

interface Props {
  readonly groupId: string;
}

export const SharedClientGroupLabel: VoidComponent<Props> = (props) => {
  const fetcher = useClientGroupFetcher();
  // eslint-disable-next-line solid/reactivity
  const {clientGroup} = fetcher(() => props.groupId);
  return <Show when={clientGroup()}>{(clientGroup) => <ClientGroupLabel group={clientGroup()} />}</Show>;
};
