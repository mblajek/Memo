import {ScrollableCell} from "data-access/memo-api/tquery/table_columns";
import {UserLink} from "features/facility-users/UserLink";
import {Index} from "solid-js";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {cellFunc, ShowCellVal} from "./table_cells";

export function useCustomTableCells() {
  return {
    facilityUsers: <T,>() =>
      cellFunc<string[], T>((props) => (
        <ScrollableCell>
          <ShowCellVal v={props.v}>
            {(v) => (
              <ul>
                <Index each={v()} fallback={<EmptyValueSymbol />}>
                  {(userId) => (
                    <li>
                      <UserLink userId={userId()} />
                    </li>
                  )}
                </Index>
              </ul>
            )}
          </ShowCellVal>
        </ScrollableCell>
      )),
  };
}
