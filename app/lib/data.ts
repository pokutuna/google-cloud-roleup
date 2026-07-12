import { toBitset } from "./bitset";

export interface PermMeta {
  title?: string;
  description?: string;
  stage?: string;
}

export interface Role {
  name: string;
  title: string;
  description?: string;
  stage?: string;
  kind: "basic" | "predefined";
  permIds: number[];
}

export interface Relation {
  /** role indexes that fully contain this role, tightest first */
  supersets: number[];
  /** role indexes fully contained by this role, largest first */
  subsets: number[];
  /** [roleIndex, jaccardPct, sharedCount], jaccard desc */
  similar: [number, number, number][];
  /**
   * Same-service roles (same role-name prefix) that are NOT already listed in
   * supersets/subsets/similar, most overlap first. Each entry is
   * [roleIndex, sharedCount] (sharedCount may be 0). Basic roles have none.
   */
  sameService: [number, number][];
}

export interface Service {
  prefix: string;
  displayName: string;
}

export interface RoleupJson {
  generatedAt: string;
  permissions: string[];
  permMeta: Record<number, PermMeta>;
  services: Service[];
  roles: Role[];
  relations: Record<number, Relation>;
}

export interface Dataset extends RoleupJson {
  roleIndexByName: Map<string, number>;
  permIdByName: Map<string, number>;
  serviceNameByPrefix: Map<string, string>;
  /** one bitset of permission membership per role, aligned with roles[] */
  roleBits: Uint32Array[];
  bitsetWords: number;
}

/** "roles/bigquery.user" -> "bigquery.user" */
export function shortRoleName(name: string): string {
  return name.startsWith("roles/") ? name.slice(6) : name;
}

/** service prefix of a role name, or null for basic/prefix-less roles */
export function roleServicePrefix(name: string): string | null {
  const short = shortRoleName(name);
  return short.includes(".") ? short.split(".")[0] : null;
}

export interface PermParts {
  service: string;
  /** middle segments, e.g. "tables" of bigquery.tables.getData */
  resource: string;
  verb: string;
  /** "service.resource" grouping key */
  group: string;
}

export function permParts(permName: string): PermParts {
  const segs = permName.split(".");
  const service = segs[0];
  const verb = segs.length > 1 ? segs[segs.length - 1] : "";
  const resource = segs.slice(1, -1).join(".");
  return { service, resource, verb, group: segs.slice(0, -1).join(".") };
}

export function serviceDisplayName(ds: Dataset, prefix: string): string {
  return ds.serviceNameByPrefix.get(prefix) ?? prefix;
}

/** Google-managed service agent role (e.g. roles/dataproc.serviceAgent) */
export function isServiceAgent(role: Role): boolean {
  const short = shortRoleName(role.name);
  const lastSeg = short.split(".").pop() ?? "";
  return /serviceagent$/i.test(lastSeg) || /service agent/i.test(role.title);
}

export function buildDataset(json: RoleupJson): Dataset {
  const words = Math.ceil(json.permissions.length / 32);
  return {
    ...json,
    roleIndexByName: new Map(json.roles.map((r, i) => [r.name, i])),
    permIdByName: new Map(json.permissions.map((p, i) => [p, i])),
    serviceNameByPrefix: new Map(
      json.services.map((s) => [s.prefix, s.displayName]),
    ),
    roleBits: json.roles.map((r) => toBitset(r.permIds, words)),
    bitsetWords: words,
  };
}

let cache: Promise<Dataset> | null = null;

export function loadDataset(): Promise<Dataset> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/roleup.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`failed to load data: ${res.status}`);
      return res.json() as Promise<RoleupJson>;
    })
    .then(buildDataset);
  return cache;
}
