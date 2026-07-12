/**
 * Generates public/data/roleup.json from Google Cloud IAM APIs.
 *
 * Requires a gcloud login (`gcloud auth print-access-token` must work).
 * Permission title/description enrichment uses the current gcloud project
 * via permissions:queryTestablePermissions and is skipped when unavailable.
 *
 * Usage: npm run generate-data
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/roleup.json",
);

const IAM_BASE = "https://iam.googleapis.com/v1";

// Role-name prefixes that cannot be matched to a *.googleapis.com service
// name automatically. Keep this list small; unmatched prefixes fall back to
// a humanized form of the prefix itself.
const SERVICE_NAME_OVERRIDES: Record<string, string> = {
  billing: "Cloud Billing",
  browser: "Resource Manager",
  cloudsql: "Cloud SQL",
  cloudtranslate: "Cloud Translation",
  clouddebugger: "Cloud Debugger",
  clouddeploymentmanager: "Deployment Manager",
  cloudiot: "Cloud IoT",
  cloudmigration: "Migrate to Virtual Machines",
  cloudsecurityscanner: "Web Security Scanner",
  cloudtestservice: "Cloud Test Lab",
  consumerprocurement: "Cloud Commerce Consumer Procurement",
  dataprocessing: "Data Processing",
  datapipelines: "Data Pipelines",
  earlyaccesscenter: "Early Access Center",
  endpointverification: "Endpoint Verification",
  identityplatform: "Identity Platform",
  oauthconfig: "OAuth Config",
  observability: "Observability",
  proximitybeacon: "Proximity Beacon",
  resourcemanager: "Resource Manager",
  runtimeconfig: "Runtime Configurator",
  secretmanager: "Secret Manager",
  servicebroker: "Service Broker",
  threatdetection: "Event Threat Detection",
  vpcaccess: "Serverless VPC Access",
};

interface ApiRole {
  name: string;
  title?: string;
  description?: string;
  stage?: string;
  includedPermissions?: string[];
}

interface ApiPermission {
  name: string;
  title?: string;
  description?: string;
  stage?: string;
}

interface RoleOut {
  name: string;
  title: string;
  description?: string;
  stage?: string;
  kind: "basic" | "predefined";
  permIds: number[];
}

interface RelationOut {
  /** role indexes that fully contain this role, tightest first */
  supersets: number[];
  /** role indexes fully contained by this role, largest first */
  subsets: number[];
  /**
   * [roleIndex, jaccardPct, sharedCount], sorted by symmetric-difference
   * distance ascending (closest first; ties broken by sharedCount desc).
   * Only roles with distance <= SIMILAR_MAX_DISTANCE are included.
   */
  similar: [number, number, number][];
  /**
   * All same-service roles (same role-name prefix), regardless of whether
   * they're already listed in supersets/subsets/similar, most overlap first.
   * Each entry is [roleIndex, sharedCount] (sharedCount may be 0). Basic
   * roles have none.
   */
  sameService: [number, number][];
}

function gcloud(args: string[]): string {
  return execFileSync("gcloud", args, {
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
  }).trim();
}

// API responses may contain raw control characters in descriptions, which
// strict JSON.parse rejects.
function parseJson<T>(text: string): T {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: sanitizing them is the point
  return JSON.parse(text.replace(/[\u0000-\u001f]/g, " ")) as T;
}

async function apiFetch<T>(
  url: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${url}: ${res.status} ${await res.text()}`);
  }
  return parseJson<T>(await res.text());
}

// The newer basic roles are returned by roles.get but omitted from
// roles.list, so they have to be fetched individually and merged in.
const BASIC_ROLES = [
  "roles/owner",
  "roles/editor",
  "roles/viewer",
  "roles/admin",
  "roles/writer",
  "roles/reader",
];

async function fetchAllRoles(token: string): Promise<ApiRole[]> {
  const roles: ApiRole[] = [];
  let pageToken = "";
  do {
    const data = await apiFetch<{ roles?: ApiRole[]; nextPageToken?: string }>(
      `${IAM_BASE}/roles?view=FULL&pageSize=1000&pageToken=${pageToken}`,
      token,
    );
    roles.push(...(data.roles ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  const listed = new Set(roles.map((r) => r.name));
  for (const name of BASIC_ROLES) {
    if (listed.has(name)) continue;
    // roles.get returns includedPermissions without a view parameter
    roles.push(await apiFetch<ApiRole>(`${IAM_BASE}/${name}`, token));
  }
  return roles;
}

async function fetchTestablePermissions(
  token: string,
  projectId: string,
): Promise<ApiPermission[]> {
  const perms: ApiPermission[] = [];
  let pageToken = "";
  do {
    const data = await apiFetch<{
      permissions?: ApiPermission[];
      nextPageToken?: string;
    }>(`${IAM_BASE}/permissions:queryTestablePermissions`, token, {
      fullResourceName: `//cloudresourcemanager.googleapis.com/projects/${projectId}`,
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    });
    perms.push(...(data.permissions ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return perms;
}

/** "bigqueryDataTransfer" -> "Bigquery Data Transfer" */
function humanize(prefix: string): string {
  const spaced = prefix.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildServices(prefixes: Set<string>): {
  prefix: string;
  displayName: string;
}[] {
  // "<prefix>.googleapis.com" exact matches are authoritative; a loose
  // first-label match (e.g. bigquerydatatransfer.googleapis.com for
  // "bigquerydatatransfer") is only a fallback and can be wrong when
  // multiple services share a first label.
  const exact = new Map<string, string>();
  const byFirstLabel = new Map<string, string>();
  try {
    const raw = gcloud([
      "services",
      "list",
      "--available",
      "--format=json(config.name,config.title)",
    ]);
    for (const s of parseJson<{ config: { name: string; title?: string } }[]>(
      raw,
    )) {
      const title = s.config.title?.replace(/\s+API$/, "");
      if (!title) continue;
      const label = s.config.name.split(".")[0];
      if (s.config.name === `${label}.googleapis.com`) {
        exact.set(label, title);
      } else if (!byFirstLabel.has(label)) {
        byFirstLabel.set(label, title);
      }
    }
  } catch (e) {
    console.warn(`service display names unavailable, using fallbacks: ${e}`);
  }
  return [...prefixes].sort().map((prefix) => ({
    prefix,
    displayName:
      exact.get(prefix) ??
      SERVICE_NAME_OVERRIDES[prefix] ??
      byFirstLabel.get(prefix) ??
      humanize(prefix),
  }));
}

const WORD_BITS = 32;

function toBitset(permIds: number[], words: number): Uint32Array {
  const bits = new Uint32Array(words);
  for (const id of permIds) {
    bits[id >>> 5] |= 1 << (id & 31);
  }
  return bits;
}

function intersectionCount(a: Uint32Array, b: Uint32Array): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    let v = a[i] & b[i];
    // popcount
    v -= (v >>> 1) & 0x55555555;
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    count += (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }
  return count;
}

const TOP_K = 10;
/** Max symmetric-difference distance (perms gained + lost) for "similar". */
const SIMILAR_MAX_DISTANCE = 100;

function computeRelations(
  roles: RoleOut[],
  permCount: number,
): Record<number, RelationOut> {
  const words = Math.ceil(permCount / WORD_BITS);
  const bitsets = roles.map((r) => toBitset(r.permIds, words));
  const sizes = roles.map((r) => r.permIds.length);

  // shared[i][j] for i < j
  const shared: Uint32Array[] = [];
  for (let i = 0; i < roles.length; i++) {
    shared[i] = new Uint32Array(roles.length - i - 1);
    for (let j = i + 1; j < roles.length; j++) {
      shared[i][j - i - 1] = intersectionCount(bitsets[i], bitsets[j]);
    }
  }
  const sharedAt = (i: number, j: number) =>
    i < j ? shared[i][j - i - 1] : shared[j][i - j - 1];

  const relations: Record<number, RelationOut> = {};
  for (let i = 0; i < roles.length; i++) {
    const supersets: number[] = [];
    const subsets: number[] = [];
    // 4th element (distance) is used for sorting only; stripped before output.
    const similar: [number, number, number, number][] = [];
    const service = roles[i].name.includes(".")
      ? roles[i].name.slice(6).split(".")[0]
      : null;

    for (let j = 0; j < roles.length; j++) {
      if (j === i || sizes[i] === 0) continue;
      const inter = sharedAt(i, j);
      const isSuper = inter === sizes[i] && sizes[j] > sizes[i];
      const isSub = inter === sizes[j] && sizes[j] > 0 && sizes[j] < sizes[i];
      if (isSuper) {
        supersets.push(j);
      } else if (isSub) {
        subsets.push(j);
      } else if (inter > 0) {
        const distance = sizes[j] - inter + (sizes[i] - inter);
        if (distance <= SIMILAR_MAX_DISTANCE) {
          const jaccard = inter / (sizes[i] + sizes[j] - inter);
          similar.push([j, Math.round(jaccard * 100), inter, distance]);
        }
      }
    }
    supersets.sort((a, b) => sizes[a] - sizes[b]);
    subsets.sort((a, b) => sizes[b] - sizes[a]);
    similar.sort((a, b) => a[3] - b[3] || b[2] - a[2]);

    const toppedSupersets = supersets.slice(0, TOP_K);
    const toppedSubsets = subsets.slice(0, TOP_K);
    const toppedSimilar: [number, number, number][] = similar
      .slice(0, TOP_K)
      .map(([roleIndex, jaccardPct, sharedCount]) => [
        roleIndex,
        jaccardPct,
        sharedCount,
      ]);
    const sameService: [number, number][] = [];
    if (service !== null) {
      for (let j = 0; j < roles.length; j++) {
        if (j === i) continue;
        if (!roles[j].name.startsWith(`roles/${service}.`)) continue;
        sameService.push([j, sharedAt(i, j)]);
      }
      sameService.sort((a, b) => b[1] - a[1] || sizes[b[0]] - sizes[a[0]]);
    }

    relations[i] = {
      supersets: toppedSupersets,
      subsets: toppedSubsets,
      similar: toppedSimilar,
      sameService,
    };
  }
  return relations;
}

function checkAgainstPrevious(roleCount: number, permCount: number): void {
  if (!existsSync(OUT_PATH)) return;
  const prev = parseJson<{ roles: unknown[]; permissions: unknown[] }>(
    readFileSync(OUT_PATH, "utf-8"),
  );
  for (const [label, now, before] of [
    ["roles", roleCount, prev.roles.length],
    ["permissions", permCount, prev.permissions.length],
  ] as const) {
    if (now < before * 0.9) {
      throw new Error(
        `anomaly: ${label} dropped ${before} -> ${now} (>10%); refusing to write`,
      );
    }
  }
}

async function main() {
  const token = gcloud(["auth", "print-access-token"]);

  console.log("fetching roles...");
  const apiRoles = await fetchAllRoles(token);
  console.log(`  ${apiRoles.length} roles`);

  const BASIC = new Set(BASIC_ROLES);
  const permNames = new Set<string>();
  for (const r of apiRoles) {
    for (const p of r.includedPermissions ?? []) permNames.add(p);
  }
  const permissions = [...permNames].sort();
  const permIdByName = new Map(permissions.map((p, i) => [p, i]));
  console.log(`  ${permissions.length} unique permissions`);

  const roles: RoleOut[] = apiRoles
    .map((r) => ({
      name: r.name,
      title: r.title ?? r.name,
      ...(r.description ? { description: r.description } : {}),
      ...(r.stage ? { stage: r.stage } : {}),
      kind: BASIC.has(r.name) ? ("basic" as const) : ("predefined" as const),
      permIds: (r.includedPermissions ?? [])
        // biome-ignore lint/style/noNonNullAssertion: id map built from the same set
        .map((p) => permIdByName.get(p)!)
        .sort((a, b) => a - b),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log("enriching permission metadata...");
  const permMeta: Record<
    number,
    { title?: string; description?: string; stage?: string }
  > = {};
  try {
    const projectId = gcloud(["config", "get-value", "project"]);
    if (!projectId || projectId === "(unset)") {
      throw new Error("no default gcloud project configured");
    }
    const testable = await fetchTestablePermissions(token, projectId);
    let enriched = 0;
    for (const p of testable) {
      const id = permIdByName.get(p.name);
      if (id === undefined) continue;
      const meta: (typeof permMeta)[number] = {};
      if (p.title) meta.title = p.title;
      if (p.description) meta.description = p.description;
      if (p.stage && p.stage !== "GA") meta.stage = p.stage;
      if (Object.keys(meta).length > 0) {
        permMeta[id] = meta;
        enriched++;
      }
    }
    console.log(`  ${enriched}/${permissions.length} permissions enriched`);
  } catch (e) {
    console.warn(`  skipped: ${e}`);
  }

  console.log("resolving service display names...");
  const prefixes = new Set<string>();
  for (const r of roles) {
    const rest = r.name.slice("roles/".length);
    if (rest.includes(".")) prefixes.add(rest.split(".")[0]);
  }
  for (const p of permissions) prefixes.add(p.split(".")[0]);
  const services = buildServices(prefixes);
  console.log(`  ${services.length} services`);

  console.log("computing role relations...");
  const relations = computeRelations(roles, permissions.length);

  checkAgainstPrevious(roles.length, permissions.length);

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    permissions,
    permMeta,
    services,
    roles,
    relations,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`wrote ${OUT_PATH}`);
}

await main();
