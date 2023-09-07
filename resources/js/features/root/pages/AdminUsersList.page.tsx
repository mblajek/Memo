import {Row} from "@tanstack/solid-table";
import {Button, Email, Modal, cellFunc, createTableTranslations, css} from "components/ui";
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
        staticTranslations={createTableTranslations("users")}
        intrinsicColumns={["id"]}
        additionalColumns={["actions"]}
        columnOptions={{
          name: {
            metaParams: {canControlVisibility: false},
          },
          email: {
            columnDef: {
              cell: cellFunc<string>((v) => <Email email={v} />),
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
              cell: (c) => <>{c.getValue() ? "💪🏽" : ""}</>,
              size: 150,
            },
          },
          actions: {
            columnDef: {
              cell: (c) => (
                <Button onClick={() => setModalDetails(c.row)}>
                  <BiSolidUserDetail class={css.inlineIcon} /> Detale
                </Button>
              ),
            },
            metaParams: {canControlVisibility: false},
          },
        }}
        initialColumnsOrder={[
          "id",
          "name",
          "email",
          "createdAt",
          "facilitiesMember",
          "numFacilities",
          "hasGlobalAdmin",
        ]}
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
