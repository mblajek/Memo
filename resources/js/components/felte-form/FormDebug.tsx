import {DEV, VoidComponent} from "solid-js";
import {useFormContext} from "./FelteForm";

/** A component rendering debugging information about a form. Only visible in the DEV mode. */
// eslint-disable-next-line no-restricted-syntax
export const FormDebug_onlyDEV: VoidComponent = () => {
  if (!DEV) {
    console.warn("Usage of FormDebug outside of DEV mode");
    // eslint-disable-next-line solid/components-return-once
    return undefined;
  }
  const {form} = useFormContext();
  return (
    <div class="h-40 text-[0.6rem] overflow-auto wrap-text">
      <pre>data: {JSON.stringify(form.data(), undefined, 2)}</pre>
      <pre class="text-red-600">errors: {JSON.stringify(form.errors(), undefined, 2)}</pre>
      <pre class="text-yellow-600">warnings: {JSON.stringify(form.warnings(), undefined, 2)}</pre>
      <pre class="text-gray-600">touched: {JSON.stringify(form.touched(), undefined, 2)}</pre>
      <pre>
        {(["isDirty", "interacted", "isValidating", "isValid", "isSubmitting"] as const)
          .map((f) => `${f}: ${JSON.stringify(form[f]())}`)
          .join(", ")}
      </pre>
    </div>
  );
};
