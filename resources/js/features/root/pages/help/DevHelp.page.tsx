import {useParams} from "@solidjs/router";
import {VoidComponent} from "solid-js";
import {Help} from "./Help";

export default (() => {
  const params = useParams();
  return <Help title="DEV Help" mdPath={`/docs/dev/${params.helpPath}.md`} />;
}) satisfies VoidComponent;
