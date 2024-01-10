import {useParams} from "@solidjs/router";
import {VoidComponent} from "solid-js";

export default (() => {
  const params = useParams();
  return <>client {params.userId}</>;
}) satisfies VoidComponent;
