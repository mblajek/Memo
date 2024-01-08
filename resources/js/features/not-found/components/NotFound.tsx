import {A, useLocation} from "@solidjs/router";
import {VoidComponent} from "solid-js";

export default (() => {
  const location = useLocation();
  return (
    <div class="w-fit bg-blue-50 p-4 mx-auto rounded-md">
      <h1 class="text-xl text-center mb-2">Nie znaleziono zasobu</h1>
      <p>
        Strona znajdująca się pod adresem {location.pathname} nie istnieje. Skontaktuj się z Administratorem lub przejdź
        na <A href="/help">stronę z pomocą</A>.
      </p>
    </div>
  );
}) satisfies VoidComponent;
