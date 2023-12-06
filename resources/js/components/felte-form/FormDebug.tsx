import {VoidComponent} from "solid-js";
import {useFormContext} from "./FelteForm";

/** A component rendering debugging information about a form. Not for production. */
export const FormDebug: VoidComponent = () => {
  const {form} = useFormContext();
  return (
    <div class="h-40 text-[0.6rem] overflow-auto wrap-text">
      <pre>data: {JSON.stringify(form.data(), undefined, 2)}</pre>
      <pre class="text-red-400">errors: {JSON.stringify(form.errors(), undefined, 2)}</pre>
      <pre class="text-yellow-600">warnings: {JSON.stringify(form.warnings(), undefined, 2)}</pre>
      <pre class="text-gray-600">touched: {JSON.stringify(form.touched(), undefined, 2)}</pre>
    </div>
  );
};
