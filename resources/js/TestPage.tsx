import {VoidComponent} from "solid-js";
import {TQuerySelect} from "./components/ui/form/TQuerySelect";
import {Admin} from "./data-access/memo-api/groups";

export default (() => {
  // During development, this place can be used to create a fake page and test components.
  // It is available at /test-page, also via the "Test page" link in the menu (DEV mode only).
  // Do not submit the changes to this file.

  return (
    <>
      <fieldset>
        <div class="flex flex-col gap-1">
          <TQuerySelect
            class="w-80"
            name="user"
            querySpec={{
              prefixQueryKey: Admin.keys.user(),
              entityURL: "admin/user",
            }}
            nullable
          />
          <TQuerySelect
            class="w-80"
            name="user"
            querySpec={{
              prefixQueryKey: Admin.keys.user(),
              entityURL: "admin/user",
              labelColumns: ["name", "email"],
              intrinsicFilter: {type: "column", column: "email", op: "null", inv: true},
              itemFunc: (row, defItem) => ({
                ...defItem(),
                text: row.getStr("name"),
                labelOnList: () => (
                  <div class="flex gap-2">
                    <span>{row.getStr("name")}</span>
                    <span class="grow" />
                    <span
                      class="text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{"max-width": "12rem"}}
                    >
                      {row.getStr("email")}
                    </span>
                  </div>
                ),
              }),
            }}
            nullable={false}
          />
          <TQuerySelect
            class="w-80"
            name="user"
            label="createdBy"
            querySpec={{
              prefixQueryKey: Admin.keys.user(),
              entityURL: "admin/user",
              limit: 60,
            }}
            priorityQuerySpec={{
              prefixQueryKey: Admin.keys.user(),
              entityURL: "admin/user",
              valueColumn: "createdBy.id",
              labelColumns: ["createdBy.name", "_count"],
              sort: [
                {type: "column", column: "_count", desc: true},
                {type: "column", column: "createdBy.name"},
              ],
              distinct: true,
              itemFunc: (row, defItem) => ({
                ...defItem(),
                text: row.getStr("createdBy.name"),
                labelOnList: () => (
                  <div class="flex items-baseline gap-2">
                    <span>{row.getStr("createdBy.name")}</span>
                    <span class="text-sm text-blue-600">({row.getStr("_count")})</span>
                  </div>
                ),
              }),
            }}
            nullable
          />
        </div>
      </fieldset>
    </>
  );
}) satisfies VoidComponent;
