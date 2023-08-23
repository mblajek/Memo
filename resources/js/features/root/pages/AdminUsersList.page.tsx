import {Row} from "@tanstack/solid-table";
import {Email, Modal, css} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AccessBarrier, DATE_TIME_WITH_WEEKDAY_FORMAT} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {BiSolidUserDetail} from "solid-icons/bi";
import {Component, Show, createSignal} from "solid-js";
import {startUsersMock} from "./users_fake_tquery";

export default (() => {
  startUsersMock();
  const [modalDetails, setModalDetails] = createSignal<Row<object>>();
  return (
    <AccessBarrier roles={["globalAdmin"]}>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.userLists()}
        staticEntityURL="entityURL"
        translations="tables.tables.users"
        intrinsicColumns={["id"]}
        additionalColumns={["actions"]}
        columnOptions={{
          id: {
            metaParams: {canControlVisibility: false},
          },
          name: {
            metaParams: {canControlVisibility: false},
          },
          email: {
            columnDef: {
              cell: (c) => <Email email={c.getValue() as string} />,
            },
          },
          createdAt: {
            columnDef: {
              sortDescFirst: true,
            },
            metaParams: {
              filtering: {
                useDateOnlyInputs: true,
              },
            },
          },
          hasGlobalAdmin: {
            columnDef: {
              cell: (c) => (c.getValue() ? "💪🏽" : ""),
            },
          },
          actions: {
            columnDef: {
              cell: (c) => (
                <button onClick={() => setModalDetails(c.row)}>
                  <BiSolidUserDetail class={css.inlineIcon} /> Detale
                </button>
              ),
            },
            metaParams: {canControlVisibility: false},
          },
        }}
        initialColumnsOrder={["name", "email", "createdAt", "facilitiesMember", "numFacilities", "hasGlobalAdmin"]}
        initialVisibleColumns={["name", "email", "createdAt", "facilitiesMember", "hasGlobalAdmin", "actions"]}
        initialSort={[{id: "name", desc: false}]}
      />
      <Modal
        // Just a demo of the modal
        open={!!modalDetails()}
        title={`Użytkownik ${modalDetails()?.getValue("name")}`}
        onEscape={setModalDetails(undefined)}
      >
        <div>
          Utworzony:{" "}
          {modalDetails() &&
            DATE_TIME_WITH_WEEKDAY_FORMAT.format(new Date(modalDetails()?.getValue("createdAt") as string))}
        </div>
        <Show when={modalDetails()?.getValue("email")}>
          <div>
            <a target="_blank" href={`mailto:${modalDetails()?.getValue("email")}`}>
              {modalDetails()?.getValue("email")}
            </a>
          </div>
        </Show>
        <Show when={modalDetails()?.getValue("facilitiesMember")}>
          <div>
            Placówki:
            <pre>{modalDetails()?.getValue("facilitiesMember")}</pre>
          </div>
        </Show>
      </Modal>
    </AccessBarrier>
  );
}) satisfies Component;
