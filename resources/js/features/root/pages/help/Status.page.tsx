import {createQuery} from "@tanstack/solid-query";
import {QueryBarrier} from "components/utils";
import {System} from "data-access/memo-api/groups";
import {VoidComponent} from "solid-js";

export default (() => {
  const statusQuery = createQuery(System.statusQueryOptions);
  return (
    <QueryBarrier queries={[statusQuery]}>
      <div class="p-2 wrapTextAnywhere">{JSON.stringify(statusQuery.data)}</div>
    </QueryBarrier>
  );
}) satisfies VoidComponent;
