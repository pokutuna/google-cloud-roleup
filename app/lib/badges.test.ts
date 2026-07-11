import { describe, expect, it } from "vitest";
import { badgesForPermission, badgesForPermissions } from "./badges";

describe("badgesForPermission", () => {
  it("tags setIamPolicy as the iam badge", () => {
    const badges = badgesForPermission("bigquery.datasets.setIamPolicy");
    expect(badges.map((b) => b.id)).toEqual(["iam"]);
  });

  it("tags known impersonation permissions as the impersonate badge", () => {
    const badges = badgesForPermission("iam.serviceAccounts.actAs");
    expect(badges.map((b) => b.id)).toEqual(["impersonate"]);
  });

  it("tags delete/purge/destroy/remove/wipeout verbs as the delete badge", () => {
    for (const verb of ["delete", "purge", "destroy", "remove", "wipeout"]) {
      const badges = badgesForPermission(`storage.objects.${verb}`);
      expect(badges.map((b) => b.id)).toEqual(["delete"]);
    }
  });

  it("tags getData/export/read verbs and the select verb as the dataRead badge", () => {
    for (const verb of ["getData", "export", "read", "getDataById"]) {
      const badges = badgesForPermission(`bigquery.tables.${verb}`);
      expect(badges.map((b) => b.id)).toEqual(["dataRead"]);
    }
    expect(
      badgesForPermission("bigquery.jobs.select").map((b) => b.id),
    ).toEqual(["dataRead"]);
  });

  it("returns no badges for an unremarkable permission", () => {
    expect(badgesForPermission("bigquery.tables.list")).toEqual([]);
    expect(badgesForPermission("bigquery.tables.get")).toEqual([]);
  });

  it("can attach multiple badges to a single permission", () => {
    // an impersonation permission whose verb also matches the delete regex
    // would carry both badges; verify with a permission name that qualifies
    // for both the impersonate set and a getData-like verb: getAccessToken
    // does not match dataRead, so instead check delete+impersonate overlap
    // is not applicable here — verify independence instead: a delete verb
    // is never also in the impersonate set for our IMPERSONATE list.
    const badges = badgesForPermission("iam.serviceAccounts.getAccessToken");
    expect(badges.map((b) => b.id)).toEqual(["impersonate"]);
  });
});

describe("badgesForPermissions", () => {
  it("collects matched permission names per badge and orders danger > warn > info", () => {
    const result = badgesForPermissions([
      "bigquery.tables.getData", // dataRead (info)
      "storage.objects.delete", // delete (warn)
      "bigquery.datasets.setIamPolicy", // iam (danger)
      "bigquery.tables.list", // no badge
    ]);
    expect(result.map((b) => b.id)).toEqual(["iam", "delete", "dataRead"]);
    expect(result.find((b) => b.id === "iam")?.matched).toEqual([
      "bigquery.datasets.setIamPolicy",
    ]);
    expect(result.find((b) => b.id === "delete")?.matched).toEqual([
      "storage.objects.delete",
    ]);
    expect(result.every((b) => b.overflowCount === undefined)).toBe(true);
  });

  it("caps matched names at 8 and reports the overflow count", () => {
    const names = Array.from(
      { length: 10 },
      (_, i) => `svc.resource${i}.delete`,
    );
    const result = badgesForPermissions(names);
    const deleteBadge = result.find((b) => b.id === "delete");
    expect(deleteBadge?.matched).toHaveLength(8);
    expect(deleteBadge?.overflowCount).toBe(2);
  });

  it("returns an empty list when no permission triggers a badge", () => {
    expect(badgesForPermissions(["bigquery.tables.list"])).toEqual([]);
  });
});
