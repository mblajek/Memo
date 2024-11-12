import {SmallSpinner} from "components/ui/Spinner";
import {EmptyValueSymbol} from "components/ui/symbols";
import {Show, VoidComponent} from "solid-js";
import {useClientGroupFetcher} from "./client_group_fetcher";
import {ClientGroupLabel} from "./ClientGroupLabel";

interface Props {
  readonly groupId: string | undefined;
}

export const SharedClientGroupLabel: VoidComponent<Props> = (props) => {
  const fetcher = useClientGroupFetcher();
  // eslint-disable-next-line solid/reactivity
  const clientGroup = fetcher.fetch(() => props.groupId);
  return (
    <Show when={props.groupId} fallback={<EmptyValueSymbol />}>
      <Show when={clientGroup()} fallback={<SmallSpinner />}>
        {(clientGroup) => <ClientGroupLabel group={clientGroup()} />}
      </Show>
    </Show>
  );
};