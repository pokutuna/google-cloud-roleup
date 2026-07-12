import { buildDataset, type Dataset, type RoleupJson } from "../data";

/**
 * Small, hand-written dataset shared across unit tests. Permissions are
 * listed in name-sorted order (as the real generator produces), spanning
 * two services with a couple of resources each, plus one prefix-less
 * permission ("browser.get") to exercise the "no resource" grouping path.
 *
 * Index : permission
 *   0 : bigquery.datasets.get
 *   1 : bigquery.datasets.setIamPolicy
 *   2 : bigquery.tables.delete
 *   3 : bigquery.tables.getData
 *   4 : bigquery.tables.list
 *   5 : browser.get
 *   6 : iam.serviceAccounts.actAs
 *   7 : storage.objects.delete
 *   8 : storage.objects.get
 *   9 : storage.objects.list
 */
export const FIXTURE_JSON: RoleupJson = {
  generatedAt: "2026-01-01T00:00:00Z",
  permissions: [
    "bigquery.datasets.get",
    "bigquery.datasets.setIamPolicy",
    "bigquery.tables.delete",
    "bigquery.tables.getData",
    "bigquery.tables.list",
    "browser.get",
    "iam.serviceAccounts.actAs",
    "storage.objects.delete",
    "storage.objects.get",
    "storage.objects.list",
  ],
  permMeta: {
    0: { title: "Get dataset", stage: "GA" },
    3: { title: "Read table data", stage: "GA" },
  },
  services: [
    { prefix: "bigquery", displayName: "BigQuery" },
    { prefix: "storage", displayName: "Cloud Storage" },
    { prefix: "iam", displayName: "IAM" },
  ],
  roles: [
    // 0: basic role, spans all services
    {
      name: "roles/viewer",
      title: "Viewer",
      description: "Read access to all resources",
      kind: "basic",
      permIds: [0, 4, 5, 8, 9],
    },
    // 1: predefined, superset of role 2 (bigquery.dataViewer)
    {
      name: "roles/bigquery.dataViewer",
      title: "BigQuery Data Viewer",
      kind: "predefined",
      permIds: [0, 3, 4],
    },
    // 2: predefined, subset of role 1 — same perms minus one
    {
      name: "roles/bigquery.metadataViewer",
      title: "BigQuery Metadata Viewer",
      kind: "predefined",
      permIds: [0, 4],
    },
    // 3: predefined, bigquery admin-ish role with delete + setIamPolicy
    {
      name: "roles/bigquery.admin",
      title: "BigQuery Admin",
      kind: "predefined",
      permIds: [0, 1, 2, 3, 4],
    },
    // 4: predefined, storage role
    {
      name: "roles/storage.objectViewer",
      title: "Storage Object Viewer",
      kind: "predefined",
      permIds: [8, 9],
    },
    // 5: service agent
    {
      name: "roles/dataproc.serviceAgent",
      title: "Cloud Dataproc Service Agent",
      description: "Google-managed service agent for Dataproc",
      kind: "predefined",
      permIds: [6],
    },
  ],
  relations: {
    0: {
      supersets: [],
      subsets: [2, 4],
      similar: [
        [1, 33, 2],
        [3, 25, 2],
      ],
      sameService: [],
    },
    1: {
      supersets: [3],
      subsets: [2],
      similar: [[0, 33, 2]],
      sameService: [],
    },
    2: {
      supersets: [1, 0, 3],
      subsets: [],
      similar: [],
      sameService: [],
    },
    3: {
      supersets: [],
      subsets: [1, 2],
      similar: [[0, 25, 2]],
      sameService: [],
    },
    4: {
      supersets: [0],
      subsets: [],
      similar: [],
      sameService: [],
    },
  },
};

export function buildFixtureDataset(): Dataset {
  return buildDataset(FIXTURE_JSON);
}
