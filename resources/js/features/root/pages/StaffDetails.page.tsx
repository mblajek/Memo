import {useParams} from "@solidjs/router";
import {VoidComponent} from "solid-js";

export default (() => {
  const params = useParams();
  return <>staff {params.userId}</>;
}) satisfies VoidComponent;
