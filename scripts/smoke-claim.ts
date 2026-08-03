/**
 * Smoke test for the one-claim-per-coverage-year rule. Run with:
 *   npx jiti scripts/smoke-claim.ts
 *
 * Exercises the data layer directly (no browser, no server): a patient may file
 * one protection claim per coverage year, measured from the order date. The
 * first claim must succeed; a second within the same year must be refused by the
 * backend — not just hidden by the UI. Also checks that eligibility (the
 * `nextClaimEligibleAt` the UI reads) is reported on the record.
 */

import { api, ApiError } from "../src/lib/api";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failures++;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\nOne claim per coverage year (measured from order date)");

  const [record] = await api.insurance.list();
  check("an insurance record loads", Boolean(record), record?.productName);
  check("and starts eligible to file", record.nextClaimEligibleAt === null,
    `nextClaimEligibleAt=${record.nextClaimEligibleAt}`);

  const order = await api.submissions.getMine();
  check("the order that anchors the coverage year loads", Boolean(order), order?.id);

  console.log("\n1. The first claim of the year is accepted");
  const filed = await api.insurance.fileClaim(record.id, {
    reason: "Broke or cracked",
    hasAppliance: true,
    detail: "The clasp snapped.",
  });
  check("the claim is recorded", filed.claim?.reason === "Broke or cracked");
  check("and the plan is now insured", filed.status === "insured", `status=${filed.status}`);
  check("filing sets a next-eligible date (the customer is now blocked)",
    typeof filed.nextClaimEligibleAt === "string" && filed.nextClaimEligibleAt !== null,
    `nextClaimEligibleAt=${filed.nextClaimEligibleAt}`);

  if (order && filed.nextClaimEligibleAt) {
    const anchor = new Date(order.createdAt);
    const next = new Date(filed.nextClaimEligibleAt);
    check("next-eligible is the order's next anniversary",
      next.getUTCFullYear() === anchor.getUTCFullYear() + 1 &&
        next.getUTCMonth() === anchor.getUTCMonth() &&
        next.getUTCDate() === anchor.getUTCDate(),
      `${order.createdAt} -> ${filed.nextClaimEligibleAt}`);
  }

  console.log("\n2. list() reflects the block on read (what the UI gates on)");
  const [afterFile] = await api.insurance.list();
  check("the record reports the customer is no longer eligible",
    afterFile.nextClaimEligibleAt !== null,
    `nextClaimEligibleAt=${afterFile.nextClaimEligibleAt}`);
  check("the claim status is exposed for the UI badge",
    afterFile.claim?.status === "in_review", `status=${afterFile.claim?.status}`);

  console.log("\n3. A second claim in the same year is refused by the backend");
  let refused: string | null = null;
  let refusedCode: string | null = null;
  try {
    await api.insurance.fileClaim(record.id, {
      reason: "Lost or missing",
      hasAppliance: false,
      detail: "Second attempt — should be blocked.",
    });
  } catch (err) {
    refused = err instanceof Error ? err.message : String(err);
    refusedCode = err instanceof ApiError ? err.code : null;
  }
  check("the second claim throws", refused !== null, refused ?? "it was allowed!");
  check("with a validation error", refusedCode === "validation", `code=${refusedCode}`);
  check("and a message that explains the once-a-year limit",
    (refused ?? "").toLowerCase().includes("coverage year"), refused ?? "");

  console.log("\n4. The refusal did not overwrite the original claim");
  const [afterRefusal] = await api.insurance.list();
  check("the first claim's reason is intact",
    afterRefusal.claim?.reason === "Broke or cracked",
    `reason=${afterRefusal.claim?.reason}`);

  console.log(
    failures === 0 ? "\nAll checks passed.\n" : `\n${failures} CHECK(S) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nHarness crashed:", err);
  process.exit(1);
});
