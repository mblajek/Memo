// deno-lint-ignore-file no-explicit-any
import {parseArgs} from "https://deno.land/std@0.220.1/cli/parse_args.ts";
import {
  Attendant,
  AttributeValues,
  FacilityContents,
  Position,
  SingleAttributeValue,
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
console.log(`  Dictionaries: ${prepared.dictionaries.length} + extend ${prepared.extendDictionaries.length}`);
console.log(`  Attributes: ${prepared.attributes.length}`);
console.log(`  Staff: ${prepared.staff.length} + give ${prepared.giveStaff.length}`);
console.log(`  Clients: ${prepared.clients.length}`);
console.log(`  Meetings: ${prepared.meetings.length}`);

if (!confirm("\nVerify the information above.\nContinue?")) {
  Deno.exit(1);
}
await new Promise((resolve) => setTimeout(resolve, 100));

let dictionaries: any[] = (await api("system/dictionary/list")).data;
let attributes: any[] = (await api("system/attribute/list")).data;

const meetingTypeDictionary = dictionaries.find((d) => d.name === "meetingType");
if (!meetingTypeDictionary) {
  throw new Error("Meeting type dictionary not found");
}

class NnMapper {
  readonly nnToId = new Map<string, string>();
  private readonly file;
  private readonly writer;
  private readonly encoder = new TextEncoder();

  constructor(readonly filePath: string) {
    this.file = Deno.openSync(filePath, {write: true, createNew: true});
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

  get(nn: string) {
    if (!this.nnToId.has(nn)) {
      throw new Error(`NN not found: ${nn}`);
    }
    return this.nnToId.get(nn);
  }
}

const nnMapper = new NnMapper(config.nnMappingFile);

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
  const {id} = (await api(path, {req: object, method: "POST", ...params})).data;
  if (nn) {
    nnMapper.set({nn, id, type});
  }
  return id;
}

function findDictionary(name: string) {
  const dict = dictionaries.find((d: any) => d.isFixed && !d.facilityId && d.name === name);
  if (!dict) {
    throw new Error(`Dictionary not found: ${name}`);
  }
  return dict;
}

function attributeValues(attributeValues: AttributeValues | undefined) {
  if (!attributeValues) {
    return {};
  }
  const res: Partial<Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(attributeValues)) {
    const attrib = attributes.find((a) => a.apiName === key) || attributes.find((a) => a.id === nnMapper.get(key));
    if (!attrib) {
      throw new Error(`Attribute not found: ${key}`);
    }
    function attrVal(val: SingleAttributeValue) {
      switch (val.kind) {
        case "const":
          return val.value;
        case "nn":
          return nnMapper.get(val.nn);
        case "dict": {
          const pos = findDictionary(val.dictName).positions.find((p: any) => p.name === val.positionName);
          if (!pos) {
            throw new Error(`Position not found: ${val.dictName}.${val.positionName}`);
          }
          return pos.id;
        }
        default:
          return val satisfies never;
      }
    }
    res[key] = Array.isArray(value) ? value.map((v) => attrVal(v)) : attrVal(value);
  }
  return res;
}

const LOG_INTERVAL_SECS = 10;
function* trackProgress<T>(array: readonly T[], type: string) {
  const len = array.length;
  console.log(`Processing ${len} ${type}...`);
  let lastLog = Date.now();
  for (let i = 0; i < len; i++) {
    yield array[i];
    if (Date.now() - lastLog > LOG_INTERVAL_SECS * 1000) {
      console.log(`  Progress: ${i + 1} / ${len} (${((100 * (i + 1)) / len).toFixed(1)}%)`);
      lastLog = Date.now();
    }
  }
  console.log(`Processing ${type} done.`);
}

async function createPosition(dictionaryId: string, pos: Position) {
  await apiCreate({
    nn: pos.nn,
    path: "system/dictionary/position",
    type: "position",
    object: {
      dictionaryId,
      facilityId,
      name: pos.name,
      isFixed: pos.isFixed,
      defaultOrder: pos.defaultOrder,
      isDisabled: pos.isDisabled,
      ...attributeValues(pos.attributes),
    },
  });
}

try {
  for (const attr of trackProgress(prepared.attributes, "attributes"))
    await apiCreate({
      nn: attr.nn,
      path: "system/attribute",
      type: "attribute",
      object: {
        facilityId,
        model: attr.model,
        name: attr.name,
        apiName: attr.apiName,
        type: attr.type,
        dictionaryId: attr.dictionaryName ? findDictionary(attr.dictionaryName) : undefined,
        isFixed: attr.isFixed,
        defaultOrder: attr.defaultOrder,
        isMultiValue: attr.isMultiValue,
        requirementLevel: attr.requirementLevel,
      },
    });
  attributes = (await api("system/attribute/list")).data;
  for (const dict of trackProgress(prepared.extendDictionaries, "dictionaries to extend")) {
    const existingDict = findDictionary(dict.name);
    for (const pos of trackProgress(dict.positions, "positions")) {
      await createPosition(existingDict.id, pos);
    }
  }
  for (const dict of trackProgress(prepared.dictionaries, "dictionaries")) {
    const dictionaryId = await apiCreate({
      nn: dict.nn,
      path: "system/dictionary",
      type: "dictionary",
      object: {
        name: dict.name,
        facilityId,
        isFixed: dict.isFixed,
        isExtendable: dict.isExtendable,
        positionRequiredAttributeIds: dict.positionRequiredAttributeIds,
      },
    });
    for (const pos of trackProgress(dict.positions, "positions")) {
      await createPosition(dictionaryId, pos);
    }
  }
  dictionaries = (await api("system/dictionary/list")).data;
  async function makeStaff(userId: string) {
    await apiCreate({
      path: "admin/member",
      type: "member",
      object: {
        userId,
        facilityId,
        isFacilityStaff: true,
      },
    });
  }
  for (const staff of trackProgress(prepared.giveStaff, "staff to give")) {
    await makeStaff(staff.id);
  }
  for (const staff of trackProgress(prepared.staff, "staff")) {
    const userId = await apiCreate({
      nn: staff.nn,
      path: "admin/user",
      type: "user",
      object: {
        name: staff.name,
        email: staff.email,
        hasEmailVerified: true,
      },
    });
    await makeStaff(userId);
  }
  for (const client of trackProgress(prepared.clients, "clients")) {
    await apiCreate({
      nn: client.nn,
      path: `/facility/${facilityId}/user/client`,
      type: "client",
      object: {
        name: client.name,
        client: attributeValues(client.client),
      },
    });
  }
  const meetingStatusDictionary = dictionaries.find((d) => d.name === "meetingStatus");
  const meetingStatuses = {
    planned: meetingStatusDictionary.positions.find((p: any) => p.name === "planned").id,
    completed: meetingStatusDictionary.positions.find((p: any) => p.name === "completed").id,
    cancelled: meetingStatusDictionary.positions.find((p: any) => p.name === "cancelled").id,
  };
  const attendanceStatusDictionary = dictionaries.find((d) => d.name === "attendanceStatus");
  const attendanceStatuses = {
    ok: attendanceStatusDictionary.positions.find((p: any) => p.name === "ok").id,
    late_present: attendanceStatusDictionary.positions.find((p: any) => p.name === "late_present").id,
    too_late: attendanceStatusDictionary.positions.find((p: any) => p.name === "too_late").id,
    no_show: attendanceStatusDictionary.positions.find((p: any) => p.name === "no_show").id,
    cancelled: attendanceStatusDictionary.positions.find((p: any) => p.name === "cancelled").id,
  };
  function attendant(att: Attendant) {
    return {
      userId: nnMapper.get(att.userNn),
      attendanceStatusDictId: attendanceStatuses[att.attendanceStatus],
    };
  }
  for (const meeting of trackProgress(prepared.meetings, "meetings")) {
    await apiCreate({
      nn: meeting.nn,
      path: `/facility/${facilityId}/meeting`,
      type: "meeting",
      object: {
        typeDictId:
          meetingTypeDictionary.positions.find((p: any) => p.name === meeting.typeDictNnOrName) ||
          nnMapper.get(meeting.typeDictNnOrName),
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
