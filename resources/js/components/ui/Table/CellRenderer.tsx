import {ColumnDefTemplate} from "@tanstack/solid-table";
import {JSX, Show} from "solid-js";
import {Dynamic} from "solid-js/web";

export interface CellRendererProps<TProps extends object> {
  /** The cell content (e.g. component/string) render */
  component: ColumnDefTemplate<TProps> | undefined;
  /** The props to pass to the cell component */
  props: TProps;
}

/**
 * Renders the TanStack Table's cell. A substitute for \@tanstack/solid-table's flexRender method.
 *
 * flexRender uses Solid's internal createComponent method, which does not memoize the component.
 * This means that every time the table is re-rendered, the component is re-created.
 * That's why we need to use Dynamic, which uses Solid's createMemo under the hood.
 */
export function CellRenderer<TProps extends object>(props: CellRendererProps<TProps>): JSX.Element {
  return (
    <Show when={props.component}>
      <Show
        when={typeof props.component === "function"}
        // The TS inference does not work in <Show>, so we need to manually cast it to a string.
        fallback={props.component as string}
      >
        <Dynamic component={props.component} {...props.props} />
      </Show>
    </Show>
  );
}
