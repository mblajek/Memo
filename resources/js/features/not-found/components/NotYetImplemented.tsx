import {useLocation} from "@solidjs/router";
import {VoidComponent} from "solid-js";

export default (() => {
  const location = useLocation();
  return (
    <div class="w-fit bg-blue-50 p-4 mx-auto rounded-md">
      <h1 class="text-xl text-center mb-2">W trakcie tworzenia</h1>
      <p>
        Strona znajdująca się pod adresem {location.pathname} nie została jeszcze utworzona. Ale to nic, na pewno kiedyś
        powstanie
      </p>
    </div>
  );
}) satisfies VoidComponent;
