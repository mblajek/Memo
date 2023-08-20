import {JSX, Show} from "solid-js";
import {Dynamic} from "solid-js/web";

export interface CellRendererProps<TProps extends object> {
  /** The cell content (e.g. component/string) render */
  component: any;
  /** The props to pass to the cell component */
  props?: TProps;
}
//aaaaaaaa
/**
 * Renders the TanStack Table's cell. A substitute for \@tanstack/solid-table's flexRender method.
 */
export function CellRenderer<TProps extends object>(props: CellRendererProps<TProps>): JSX.Element {
  return (
    <Show when={props.component}>
      <Show when={typeof props.component === "function"} fallback={props.component}>
        <Dynamic component={props.component} {...props.props} />
      </Show>
    </Show>
  );
}
