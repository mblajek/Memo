// deno-lint-ignore-file no-explicit-any
import {parseArgs} from "https://deno.land/std@0.220.1/cli/parse_args.ts";
import {
  Attendant,
  AttributeValues,
  FacilityContents,
  Order,
  Position,
  PositionInExtension,
  RelSpec,
  SingleAttributeValue,
  facilityContentStats,
} from "./facility_contents_type.ts";
import {readConfig} from "./import_config.ts";

const params = parseArgs(Deno.args, {
  string: ["config"],
});

if (!params.config) {
  console.error("Provide path to the config JSON file as --config");
  Deno.exit(1);
}
const config = readConfig(params.config);

console.log("Config:", {...config, importUserMemoSession: "***"});

interface CallParams extends RequestInit {
  readonly req?: object;
  readonly runEvenInDryRun?: boolean;
}

async function api(path: string, params?: CallParams) {
  const fullPath = `${config.memoURL}api/v1/${path}`;
  const body = params?.req ? JSON.stringify(params.req) : params?.body;
  const fetchParams = {
    method: body ? "POST" : "GET",
    ...params,
    headers: {
      ...(body ? {"Content-Type": "application/json"} : undefined),
      Cookie: `memo_session=${config.importUserMemoSession}`,
      ...params?.headers,
    },
    body,
  };
  const callBackend = !config.dryRun || params?.runEvenInDryRun || fetchParams.method === "GET";
  if (callBackend) {
    const resp = await fetch(fullPath, fetchParams);
    if (!resp.ok) {
      console.error("Error response:", await resp.text());
      throw new Error(`Error fetching ${fullPath}: ${resp.status} ${resp.statusText}`);
    }
    const type = resp.headers.get("content-type");
    if (!type?.match(/^application\/json(;.+)?$/)) {
      throw new Error(`Unexpected content type: ${type}`);
    }
    const json = await resp.json();
    if (json.errors) {
      throw new Error(`API error: ${JSON.stringify(json.errors)}`);
    }
    return json;
  } else {
    console.debug(`Dry run, would fetch ${fullPath} with params:`, fetchParams);
    return {data: {}};
  }
}

async function apiCount(entityURL: string) {
  return (
    await api(`${entityURL}/tquery`, {
      req: {
        columns: [{type: "column", column: "id"}],
        paging: {size: 1},
      },
      runEvenInDryRun: true,
    })
  ).meta.totalDataSize;
}

const userData = (await api("user/status")).data;
console.log(`User: ${userData.user.name} (${userData.user.email}, ${userData.user.id})`);
console.log(
  `  Permissions: ${["globalAdmin", "developer", "facilityAdmin"].filter((p) => userData.permissions[p]).join(", ") || "-"}`,
);
if (!userData.permissions.developer || !userData.permissions.facilityAdmin) {
  throw new Error("Not enough permissions");
}

const facility = (await api("system/facility/list")).data.find((f: any) => f.id === config.facilityId);
if (!facility) {
  throw new Error(`The specified facility does not exist`);
}
const facilityId = facility.id;
console.log(`Facility: ${facility.name} (${facilityId})`);
console.log(`  Staff: ${await apiCount(`facility/${facility.id}/user/staff`)}`);
console.log(`  Clients: ${await apiCount(`facility/${facility.id}/user/client`)}`);
console.log(`  Meetings: ${await apiCount(`facility/${facility.id}/meeting`)}`);

const prepared = JSON.parse(Deno.readTextFileSync(config.preparedFile)) as FacilityContents;

console.log("Data to import:");
console.log(facilityContentStats(prepared));

if (!confirm("\nVerify the information above.\nContinue?")) {
  Deno.exit(1);
}
await new Promise((resolve) => setTimeout(resolve, 100));

let dictionaries: any[] = [];
let attributes: any[] = [];

async function loadDictionaries() {
  dictionaries = (await api("system/dictionary/list")).data;
}

async function loadAttributes() {
  attributes = (await api("system/attribute/list")).data;
}

loadDictionaries();
loadAttributes();

class NnMapper {
  readonly nnToId = new Map<string, string>();
  private readonly file;
  private readonly writer;
  private readonly encoder = new TextEncoder();

  constructor(readonly filePathBase: string) {
    this.file = Deno.openSync(
      `${filePathBase}_${new Date().toISOString().slice(0, 19).replaceAll(/[-:]/, "").replace("T", "_")}.csv`,
      {
        write: true,
        createNew: true,
      },
    );
    this.writer = this.file.writable.getWriter();
    this.write("nn,id,type\n");
  }

  async close() {
    await this.writer.close();
  }

  private async write(line: string) {
    await this.writer.write(this.encoder.encode(line));
  }

  async set({nn, id, type}: {nn: string; id: string; type: string}) {
    if (this.nnToId.has(nn)) {
      throw new Error(`Duplicate NN: ${JSON.stringify(nn)}, defined as id ${this.nnToId.get(nn)} and ${id}`);
    }
    this.nnToId.set(nn, id);
    await this.write([nn, id, type].join(",") + "\n");
  }

  has(nn: string) {
    return this.nnToId.has(nn);
  }

  get(nn: string) {
    if (!this.nnToId.has(nn)) {
      throw new Error(`NN not found: ${nn}`);
    }
    return this.nnToId.get(nn);
  }
}

const nnMapper = new NnMapper(config.nnMappingFileBase);

async function apiCreate({
  nn,
  path,
  type,
  object,
  params,
}: {
  nn?: string;
  path: string;
  type: string;
  object: object;
  params?: CallParams;
}) {
  const resp = (await api(path, {req: object, method: "POST", ...params})).data;
  const {id} = resp;
  if (nn && id) {
    nnMapper.set({nn, id, type});
  }
  return resp;
}

function fixedDict(name: string) {
  const dict = dictionaries.find((d) => d.isFixed && !d.facilityId && d.name === name);
  if (!dict) {
    throw new Error(`Fixed global dictionary not found: name=${name}`);
  }
  return dict;
}

function findDict(nnOrName: string) {
  if (nnMapper.has(nnOrName)) {
    const id = nnMapper.get(nnOrName);
    const dict = dictionaries.find((d) => d.id === id);
    if (!dict) {
      throw new Error(`Dictionary not found: nnOrName=${nnOrName}`);
    }
    return dict;
  }
  return fixedDict(nnOrName);
}

function findPos(dictionary: any, posNnOrName: string) {
  let pos;
  if (nnMapper.has(posNnOrName)) {
    const id = nnMapper.get(posNnOrName);
    pos = dictionary.positions.find((p: any) => (p.id = id));
  } else {
    pos = dictionary.positions.find((p: any) => p.name === posNnOrName);
  }
  if (!pos) {
    throw new Error(`Position not found: dict=${dictionary.name} nnOrName=${posNnOrName}`);
  }
  return pos;
}

function findAttrib(apiName: string) {
  const attrib = attributes.find((a) => a.apiName === apiName);
  if (!attrib) {
    throw new Error(`Attribute not found: apiName=${apiName}`);
  }
  return attrib;
}

function attributeValues(attributeValues: AttributeValues | undefined) {
  if (!attributeValues) {
    return {};
  }
  const res: Partial<Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(attributeValues)) {
    findAttrib(key);
    const attrVal = (val: SingleAttributeValue) => {
      const {kind} = val;
      switch (kind) {
        case "const":
          return val.value;
        case "nn":
          return nnMapper.get(val.nn);
        case "dict": {
          const pos = findDict(val.dictName).positions.find((p: any) => p.name === val.positionName);
          if (!pos) {
            throw new Error(`Position not found: ${val.dictName}.${val.positionName}`);
          }
          return pos.id;
        }
        default:
          throw new Error(`Bad attribute value kind: ${kind}`);
      }
    };
    if (value) {
      res[key] = Array.isArray(value) ? value.map((v) => attrVal(v)) : attrVal(value);
    }
  }
  return res;
}

const LOG_INTERVAL_SECS = 10;
function* trackProgress<T>(array: readonly T[], type: string) {
  const len = array.length;
  if (!len) {
    console.log(`No ${type} to process.`);
    return;
  }
  console.log(`Processing ${len} ${type}...`);
  const start = Date.now();
  let lastLog = start;
  for (let i = 0; i < len; i++) {
    yield array[i];
    const now = Date.now();
    if (now - lastLog > LOG_INTERVAL_SECS * 1000) {
      console.log(
        `  Progress: ${i + 1} / ${len} (${((100 * (i + 1)) / len).toFixed(1)}% done, ${(((i + 1) / (now - start)) * 60 * 1000).toFixed(1)} per minute)`,
      );
      lastLog = now;
    }
  }
  console.log(`Processing ${type} done (${((len / (Date.now() - start)) * 60 * 1000).toFixed(1)} per minute).`);
}

function getDefaultOrder<RelKey extends string>(
  order: Order<RelKey>,
  getItemDefaultOrder: (order: RelSpec<RelKey>) => number,
): number | undefined {
  if (order === "atStart") {
    return 1;
  } else if (order === "atEnd") {
    return undefined;
  } else {
    const relDefOrder = getItemDefaultOrder(order);
    return order.rel === "before" ? relDefOrder : relDefOrder + 1;
  }
}

async function createPosition({
  dictionaryId,
  dictNnOrName,
  pos,
}: {
  dictionaryId: string;
  dictNnOrName: string;
  pos: Position & Partial<PositionInExtension>;
}) {
  await apiCreate({
    nn: pos.nn,
    path: `facility/${facilityId}/admin/position`,
    type: "position",
    object: {
      dictionaryId,
      name: pos.name,
      defaultOrder: pos.order
        ? getDefaultOrder(pos.order, (o) => {
            loadDictionaries();
            return findPos(findDict(dictNnOrName), o.positionNnOrName).defaultOrder;
          })
        : null,
      isDisabled: pos.isDisabled ?? null,
      ...attributeValues(pos.attributes),
    },
  });
}

try {
  for (const action of trackProgress(prepared.dictionariesAndAttributes, "dictionaries and attributes")) {
    const {kind} = action;
    if (kind === "createAttribute") {
      const attr = action;
      await apiCreate({
        nn: attr.nn,
        path: `facility/${facilityId}/admin/attribute`,
        type: "attribute",
        object: {
          model: attr.model,
          name: attr.name,
          apiName: attr.apiName,
          type: attr.type,
          dictionaryId: attr.dictionaryNnOrName ? findDict(attr.dictionaryNnOrName) : undefined,
          defaultOrder: getDefaultOrder(attr.order, (o) => {
            loadAttributes();
            return findAttrib(o.attributeApiName).defaultOrder;
          }),
          isMultiValue: attr.isMultiValue,
          requirementLevel: attr.requirementLevel,
        },
      });
    } else if (kind === "createDictionary") {
      const dict = action;
      const dictionaryId = (
        await apiCreate({
          nn: dict.nn,
          path: `facility/${facilityId}/admin/dictionary`,
          type: "dictionary",
          object: {
            name: dict.name,
            positionRequiredAttributeIds: dict.positionRequiredAttributeApiNames?.map(
              (apiName) => findAttrib(apiName).id,
            ),
          },
        })
      ).id;
      for (const pos of dict.positions) {
        await createPosition({dictionaryId, dictNnOrName: dict.name, pos});
      }
    } else if (kind === "extendDictionary") {
      const dict = action;
      const dictionary = findDict(dict.name);
      for (const pos of dict.positions) {
        await createPosition({dictionaryId: dictionary.id, dictNnOrName: dict.name, pos});
      }
    } else {
      throw new Error(`Unknown action kind: ${kind}`);
    }
  }

  const makeStaff = async (userId: string) =>
    await apiCreate({
      path: "admin/member",
      type: "member",
      object: {
        userId,
        facilityId,
        isFacilityStaff: true,
      },
    });
  for (const staff of trackProgress(prepared.giveStaff, "staff to give")) {
    await makeStaff(staff.id);
    if (staff.nn) {
      nnMapper.set({nn: staff.nn, id: staff.id, type: "user"});
    }
  }
  for (const staff of trackProgress(prepared.staff, "staff")) {
    const userId = (
      await apiCreate({
        nn: staff.nn,
        path: "admin/user",
        type: "user",
        object: {
          name: staff.name,
          email: staff.email,
          hasEmailVerified: true,
        },
      })
    ).id;
    await makeStaff(userId);
  }
  for (const client of trackProgress(prepared.clients, "clients")) {
    const {clientId} = await apiCreate({
      nn: client.nn,
      path: `/facility/${facilityId}/user/client`,
      type: "client",
      object: {
        name: client.name,
        client: attributeValues(client.client),
      },
    });
    await api("/admin/developer/overwrite-metadata", {
      req: {
        model: "client",
        id: clientId,
        createdBy: client.createdByNn ? nnMapper.get(client.createdByNn) : undefined,
        createdAt: client.createdAt,
      },
      method: "POST",
    });
  }
  loadDictionaries();
  const meetingTypeDictionary = fixedDict("meetingType");
  const meetingStatusDictionary = fixedDict("meetingStatus");
  const meetingStatuses = {
    planned: meetingStatusDictionary.positions.find((p: any) => p.name === "planned").id,
    completed: meetingStatusDictionary.positions.find((p: any) => p.name === "completed").id,
    cancelled: meetingStatusDictionary.positions.find((p: any) => p.name === "cancelled").id,
  };
  const attendanceStatusDictionary = fixedDict("attendanceStatus");
  const attendanceStatuses = {
    ok: attendanceStatusDictionary.positions.find((p: any) => p.name === "ok").id,
    late_present: attendanceStatusDictionary.positions.find((p: any) => p.name === "late_present").id,
    too_late: attendanceStatusDictionary.positions.find((p: any) => p.name === "too_late").id,
    no_show: attendanceStatusDictionary.positions.find((p: any) => p.name === "no_show").id,
    cancelled: attendanceStatusDictionary.positions.find((p: any) => p.name === "cancelled").id,
  };
  const attendant = (att: Attendant) => ({
    userId: nnMapper.get(att.userNn),
    attendanceStatusDictId: attendanceStatuses[att.attendanceStatus],
  });
  for (const meeting of trackProgress(prepared.meetings, "meetings")) {
    await apiCreate({
      nn: meeting.nn,
      path: `/facility/${facilityId}/meeting`,
      type: "meeting",
      object: {
        typeDictId: nnMapper.has(meeting.typeDictNnOrName)
          ? nnMapper.get(meeting.typeDictNnOrName)
          : meetingTypeDictionary.positions.find((p: any) => p.name === meeting.typeDictNnOrName),
        notes: meeting.notes,
        date: meeting.date,
        startDayminute: meeting.startDayMinute,
        durationMinutes: meeting.durationMinutes,
        statusDictId: meetingStatuses[meeting.status],
        isRemote: meeting.isRemote,
        staff: meeting.staff.map(attendant),
        clients: meeting.clients.map(attendant),
        fromMeetingId:
          meeting.fromMeetingNn && meeting.fromMeetingNn !== meeting.nn
            ? nnMapper.get(meeting.fromMeetingNn)
            : undefined,
      },
    });
  }
} finally {
  await nnMapper.close();
}
