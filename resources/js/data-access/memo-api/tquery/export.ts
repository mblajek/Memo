import {V1} from "../config";
import {DataItem, DataRequest, DataResponse} from "./types";

/** The number of table cells (columns * rows) to request on a single page. */
const NUM_CELLS_PER_PAGE = 50000;

/** Fetches all the rows from tquery and returns them asynchronously. */
export async function* getAllRowsExportIterator({
  entityURL,
  baseRequest,
}: {
  entityURL: string;
  baseRequest: DataRequest;
}): AsyncIterator<DataItem> {
  if (!baseRequest.columns.length) {
    return;
  }
  const pageSize = Math.max(1, Math.ceil(NUM_CELLS_PER_PAGE / baseRequest.columns.length));
  function fetchPage(offset: number) {
    return V1.post<DataResponse>(`${entityURL}/tquery`, {
      ...baseRequest,
      paging: {offset, size: pageSize},
    }).then((res) => res.data);
  }
  let offset = 0;
  let resp: DataResponse;
  let fetch = fetchPage(offset);
  for (;;) {
    resp = await fetch;
    offset += resp.data.length;
    // Start fetching the next page before processing the results.
    const nextFetch = offset < resp.meta.totalDataSize ? fetchPage(offset) : undefined;
    yield* resp.data;
    if (!nextFetch) {
      break;
    }
    fetch = nextFetch;
  }
}
