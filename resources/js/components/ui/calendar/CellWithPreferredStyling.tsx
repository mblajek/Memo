import {cx, htmlAttributes} from "components/utils";
import {createMemo, Index, ParentComponent, splitProps} from "solid-js";
import {CellStylingPreference} from "./types";

interface Props extends htmlAttributes.div {
  readonly preferences: readonly CellStylingPreference[];
}

/**
 * A div displaying the children on a background calculated from the preferences.
 *
 * The preferred stylings (backgrounds) are drawn on top of each other, starting from the lowest
 * strength to the highest (if multiple preferences have the same strength, only the last one of them
 * is drawn). This allows the highest strength preference to override the lower ones, or to hide them
 * only partially if it uses transparency.
 */
export const CellWithPreferredStyling: ParentComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["preferences", "children"]);
  const preferencesByStrength = createMemo(() => {
    const res = new Map<number, CellStylingPreference>();
    for (const preference of props.preferences) {
      res.set(preference.strength, preference);
    }
    return [...res].sort(([strengthA], [strengthB]) => strengthA - strengthB).map(([, pref]) => pref);
  });
  return (
    <div {...htmlAttributes.merge(divProps, {class: "grid"})}>
      <Index each={preferencesByStrength()}>
        {(preference) => <div class={cx("col-start-1 row-start-1", preference().class)} style={preference().style} />}
      </Index>
      <div class="col-start-1 row-start-1 min-w-0">{props.children}</div>
    </div>
  );
};
