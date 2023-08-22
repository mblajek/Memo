import {createQuery} from "@tanstack/solid-query";
import {System} from "data-access/memo-api";
import {Admin} from "data-access/memo-api/groups/Admin";
import {
  ColumnSchema,
  ColumnType,
  ComparableFilterOp,
  DataRequest,
  DataResponse,
  Filter,
  Schema,
  StringFilterOp,
} from "data-access/memo-api/tquery";
import {rest, setupWorker} from "msw";

type Row = Partial<Record<string, unknown>>;

type ComparableVal = number | string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompareTransform = (v: any) => ComparableVal;

const str = (v: unknown) => (v ?? undefined) as string | undefined;

function getCompareTransform(type: ColumnType): CompareTransform {
  return type === "bool"
    ? Number
    : type === "date" || type === "datetime"
    ? (v) => Date.parse(v)
    : type === "decimal0" || type === "decimal2"
    ? (v) => v
    : type === "text" || type === "string"
    ? (v) => str(v)?.toLocaleLowerCase() || ""
    : (type satisfies never);
}

function filterOp(rowVal: ComparableVal, filterVal: ComparableVal, op: StringFilterOp | ComparableFilterOp) {
  switch (op) {
    case "=":
      return rowVal === filterVal;
    case "!=":
      return rowVal !== filterVal;
    case ">":
      return rowVal > filterVal;
    case ">=":
      return rowVal >= filterVal;
    case "<":
      return rowVal < filterVal;
    case "<=":
      return rowVal <= filterVal;
    case "v%":
      return str(rowVal)?.startsWith(filterVal as string) || false;
    case "%v":
      return str(rowVal)?.endsWith(filterVal as string) || false;
    case "%v%":
      return str(rowVal)?.includes(filterVal as string) || false;
    case "/v/":
      return typeof rowVal === "string" ? new RegExp(filterVal as string).test(rowVal) : false;
    default:
      return op satisfies never;
  }
}

function colType(columns: ColumnSchema[], colName: string) {
  const col = columns.find(({name}) => name === colName);
  if (!col) {
    throw new Error(`No column ${colName}`);
  }
  return col.type;
}

function matches(columns: ColumnSchema[], row: Row, filter: Filter): boolean {
  function matchesNoInv(): boolean {
    switch (filter.type) {
      case "op": {
        const vals = filter.val.map((f) => matches(columns, row, f));
        switch (filter.op) {
          case "&":
            return vals.reduce((a, b) => a && b, true);
          case "|":
            return vals.reduce((a, b) => a || b, false);
          default:
            return filter satisfies never;
        }
      }
      case "column": {
        const valTf = getCompareTransform(colType(columns, filter.column));
        return filterOp(valTf(row[filter.column]), valTf(filter.val), filter.op);
      }
      case "custom":
        return false;
      case "global":
        return columns.some(({name}) =>
          filterOp(String(row[name]).toLocaleLowerCase(), filter.val.toLocaleLowerCase(), filter.op),
        );
      default:
        return filter satisfies never;
    }
  }
  return matchesNoInv() !== !!filter.inv;
}

export function startUsersMock() {
  const usersQuery = createQuery(Admin.usersQueryOptions);
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const columns: ColumnSchema[] = [
    {name: "createdAt", type: "datetime"},
    {name: "email", type: "string"},
    {name: "facilitiesMember", type: "text"},
    {name: "hasGlobalAdmin", type: "bool"},
    {name: "id", type: "string"},
    {name: "name", type: "string"},
    {name: "numFacilities", type: "decimal0"},
  ];
  setupWorker(
    rest.get("/api/v1/entityURL/tquery", (req, res, ctx) => {
      return res(
        ctx.delay(1000),
        ctx.status(200),
        ctx.json({
          columns,
        } satisfies Schema),
      );
    }),
    rest.post("/api/v1/entityURL/tquery", async (req, res, ctx) => {
      const request: DataRequest = await req.json();
      const rows: Row[] = (usersQuery.data || []).map((entry) => ({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        createdAt: entry.createdAt,
        facilitiesMember: entry.members
          .map(
            (m) =>
              (facilitiesQuery?.data?.find((f) => f.id === m.facilityId)?.name || m.facilityId) +
              (m.hasFacilityAdmin ? " *" : ""),
          )
          .sort()
          .join("\n"),
        numFacilities: entry.members.length,
        hasGlobalAdmin: entry.hasGlobalAdmin,
      }));
      const {filter} = request;
      const filteredRows = filter ? rows.filter((row) => matches(columns, row, filter)) : rows;
      const sorters = request.sort.map(({column, dir}) => {
        const valTf = getCompareTransform(colType(columns, column));
        const dirC = dir === "asc" ? 1 : -1;
        return (a: Row, b: Row) => {
          const va = valTf(a[column]);
          const vb = valTf(b[column]);
          return dirC * (va < vb ? -1 : va > vb ? 1 : 0);
        };
      });
      const sortedRows = [...filteredRows].sort((a, b) => sorters.reduce((acc, sorter) => acc || sorter(a, b), 0));
      const pagedRows = sortedRows.slice(
        request.paging.pageIndex * request.paging.pageSize,
        (request.paging.pageIndex + 1) * request.paging.pageSize,
      );
      const finalRows = pagedRows.map((r: Row) => {
        const res: Row = {};
        for (const {column} of request.columns) {
          res[column] = r[column];
        }
        return res;
      });
      return res(
        ctx.delay(1000),
        ctx.status(200),
        ctx.json({
          meta: {
            columns: request.columns,
            totalDataSize: filteredRows.length,
          },
          data: finalRows,
        } satisfies DataResponse),
      );
    }),
  ).start();
}
