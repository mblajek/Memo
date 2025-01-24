import {trimInput} from "components/ui/form/util";
import {removeDiacritics} from "components/utils/text_util";

/** Produces best effort suggestion for the url, e.g. "My Facility Name" --> "my-facility-name" */
export function getUrlSuggestion(name: string) {
  return (
    trimInput(
      removeDiacritics(name.toLocaleLowerCase())
        // Treat dash as space before trimInput, so we trim repeated and trailing dashes together with spaces.
        .replaceAll("-", " ")
        // Remove everything that wasn't converted to ascii
        .replaceAll(/[^a-z0-9 ]/g, ""),
    )
      // Restore dash as delimiter
      .replaceAll(" ", "-")
  );
}
