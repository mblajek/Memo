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
      console.error("Request:", fullPath, fetchParams);
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

const facility = (await api("system/facility/list")).data.find((f: any) => f.id === config.facilityId);
if (!facility) {
  throw new Error(`The specified facility does not exist`);
}
const facilityId = facility.id;

const userData = (await api(`user/status/${facilityId}`)).data;
console.log(`User: ${userData.user.name} (${userData.user.email}, ${userData.user.id})`);
console.log(
  `  Permissions: ${["globalAdmin", "developer", "facilityAdmin"].filter((p) => userData.permissions[p]).join(", ") || "-"}`,
);
if (!userData.permissions.developer || !userData.permissions.facilityAdmin) {
  throw new Error("Not enough permissions");
}

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

const cache: {dictionaries: any[] | undefined; attributes: any[] | undefined} = {
  dictionaries: undefined,
  attributes: undefined,
};

async function getDictionaries() {
  if (!cache.dictionaries) {
    cache.dictionaries = (await api("system/dictionary/list")).data;
  }
  return cache.dictionaries!;
}

async function getAttributes() {
  if (!cache.attributes) {
    cache.attributes = (await api("system/attribute/list")).data;
  }
  return cache.attributes!;
}

class NnMapper {
  readonly nnToId = new Map<string, string>();
  private readonly file;
  private readonly writer;
  private readonly encoder = new TextEncoder();

  constructor(readonly filePathBase: string) {
    this.file = Deno.openSync(
      `${filePathBase}_${new Date().toISOString().slice(0, 19).replaceAll(/[-:]/g, "").replace("T", "_")}.csv`,
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

  async set({nn, id, type}: {nn: string | readonly string[]; id: string; type: string}) {
    const nns = Array.isArray(nn) ? nn : [nn];
    for (const nn of nns) {
      if (this.nnToId.has(nn)) {
        throw new Error(`Duplicate NN: ${JSON.stringify(nn)}, defined as id ${this.nnToId.get(nn)} and ${id}`);
      }
      this.nnToId.set(nn, id);
      await this.write([nn, id, type].join(",") + "\n");
    }
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

async function apiMutate({path, type, params}: {path: string; type: string; params: CallParams}) {
  const resp = (await api(path, params)).data;
  if (type === "dictionary" || type === "position") {
    cache.dictionaries = undefined;
  } else if (type === "attribute") {
    cache.attributes = undefined;
  }
  return resp;
}

async function apiCreate({
  nn,
  path,
  type,
  object,
  params,
}: {
  nn?: string | readonly string[];
  path: string;
  type: string;
  object: object;
  params?: CallParams;
}) {
  const resp = await apiMutate({path, type, params: {req: object, ...params}});
  const {id} = resp;
  if (nn && id) {
    nnMapper.set({nn, id, type});
  }
  return resp;
}

async function apiPatch({
  nn,
  id,
  path,
  type,
  object,
  params,
}: {
  nn?: string | readonly string[];
  id: string;
  path: string;
  type: string;
  object: object;
  params?: CallParams;
}) {
  const resp = await apiMutate({path: `${path}/${id}`, type, params: {method: "PATCH", req: object, ...params}});
  if (nn) {
    nnMapper.set({nn, id, type});
  }
  return resp;
}

async function findDict(nnOrName: string) {
  let dict;
  if (nnMapper.has(nnOrName)) {
    const id = nnMapper.get(nnOrName);
    dict = (await getDictionaries()).find((d) => d.id === id);
  } else {
    dict = (await getDictionaries()).find((d) => d.name === nnOrName);
  }
  if (!dict) {
    throw new Error(`Dictionary not found: nnOrName=${nnOrName}`);
  }
  return dict;
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

async function findAttrib(apiName: string) {
  const findApiName = apiName.endsWith(ATTRIBUTE_UUID_SUFFIX) ? GENERATED_API_NAMES.get(apiName) : apiName;
  const attrib = (await getAttributes()).find((a) => a.apiName === findApiName);
  if (!attrib) {
    throw new Error(`Attribute not found: apiName=${apiName}`);
  }
  return attrib;
}

const ATTRIBUTE_UUID_SUFFIX = "U$";

function randomAttributeUuidSuffix() {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
}

const GENERATED_API_NAMES = new Map<string, string>();

function makeAttrApiName(baseApiName: string) {
  if (baseApiName.endsWith(ATTRIBUTE_UUID_SUFFIX)) {
    const apiName = baseApiName.slice(0, -1) + randomAttributeUuidSuffix();
    GENERATED_API_NAMES.set(baseApiName, apiName);
    return apiName;
  }
  return baseApiName;
}

async function attributeValues(attributeValues: AttributeValues | undefined) {
  if (!attributeValues) {
    return {};
  }
  const res: Partial<Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(attributeValues)) {
    const attrib = await findAttrib(key);
    const attrVal = async (val: SingleAttributeValue) => {
      const {kind} = val;
      switch (kind) {
        case "const":
          return val.value;
        case "nn":
          return nnMapper.get(val.nn);
        case "dict": {
          const pos = (await findDict(val.dictName)).positions.find((p: any) => p.name === val.positionName);
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
      res[attrib.apiName] = Array.isArray(value)
        ? await Promise.all(value.map(async (v) => await attrVal(v)))
        : await attrVal(value);
    }
  }
  return res;
}

const LOG_INTERVAL_SECS = 10;
function* trackProgress<T>(array: readonly T[] | undefined, type: string) {
  const len = array?.length;
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

async function getDefaultOrder<RelKey extends string>(
  order: Order<RelKey>,
  getItemDefaultOrder: (order: RelSpec<RelKey>) => number | Promise<number>,
): Promise<number | undefined> {
  if (order === "atStart") {
    return 1;
  } else if (order === "atEnd") {
    return undefined;
  } else {
    const relDefOrder = await getItemDefaultOrder(order);
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
  return await apiCreate({
    nn: pos.nn,
    path: `facility/${facilityId}/admin/position`,
    type: "position",
    object: {
      dictionaryId,
      name: pos.name,
      defaultOrder: pos.order
        ? await getDefaultOrder(
            pos.order,
            async (o) => findPos(await findDict(dictNnOrName), o.positionNnOrName).defaultOrder,
          )
        : undefined,
      isDisabled: pos.isDisabled ?? false,
      ...(await attributeValues(pos.attributes)),
    },
  });
}

try {
  for (const defNn of prepared.defNn || []) {
    nnMapper.set(defNn);
  }

  if (!config.skipDictionariesAndAttributes)
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
            apiName: makeAttrApiName(attr.apiName),
            type: attr.type,
            dictionaryId: attr.dictionaryNnOrName ? (await findDict(attr.dictionaryNnOrName)).id : null,
            defaultOrder: await getDefaultOrder(
              attr.order,
              async (o) => (await findAttrib(o.attributeApiName)).defaultOrder,
            ),
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
              positionRequiredAttributeIds: dict.positionRequiredAttributeApiNames
                ? await Promise.all(
                    dict.positionRequiredAttributeApiNames.map(async (apiName) => (await findAttrib(apiName)).id),
                  )
                : undefined,
            },
          })
        ).id;
        for (const pos of dict.positions) {
          await createPosition({dictionaryId, dictNnOrName: dict.name, pos});
        }
      } else if (kind === "extendDictionary") {
        const dict = action;
        const dictionary = await findDict(dict.name);
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
        hasFacilityAdmin: false,
        isFacilityClient: false,
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
          email: staff.email ? (config.staffEmailsPrefix || "") + staff.email : null,
          hasEmailVerified: !!staff.email,
          password: null,
          passwordExpireAt: null,
          hasGlobalAdmin: false,
        },
      })
    ).id;
    await makeStaff(userId);
  }

  for (const client of trackProgress(prepared.clients, "clients")) {
    const {clientId} = await apiCreate({
      nn: client.nn,
      path: `facility/${facilityId}/user/client`,
      type: "client",
      object: {
        name: client.name,
        client: await attributeValues(client.client),
      },
    });
    await api("admin/developer/overwrite-metadata", {
      req: {
        model: "client",
        id: clientId,
        createdBy: client.createdByNn ? nnMapper.get(client.createdByNn) : undefined,
        createdAt: client.createdAt,
      },
    });
  }
  for (const clientPatch of trackProgress(prepared.patchClients, "clients to patch")) {
    await apiPatch({
      nn: clientPatch.nn,
      id: clientPatch.id,
      path: `facility/${facilityId}/user/client`,
      type: "client",
      object: {
        name: clientPatch.name,
        client: await attributeValues(clientPatch.client),
      },
    });
  }
  const meetingTypeDictionary = await findDict("meetingType");
  const meetingStatusDictionary = await findDict("meetingStatus");
  const meetingStatuses = {
    planned: meetingStatusDictionary.positions.find((p: any) => p.name === "planned").id,
    completed: meetingStatusDictionary.positions.find((p: any) => p.name === "completed").id,
    cancelled: meetingStatusDictionary.positions.find((p: any) => p.name === "cancelled").id,
  };
  const attendanceStatusDictionary = await findDict("attendanceStatus");
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
      path: `facility/${facilityId}/meeting`,
      type: "meeting",
      object: {
        typeDictId: nnMapper.has(meeting.typeDictNnOrName)
          ? nnMapper.get(meeting.typeDictNnOrName)
          : meetingTypeDictionary.positions.find((p: any) => p.name === meeting.typeDictNnOrName).id,
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
