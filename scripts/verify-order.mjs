import { chromium } from "playwright";

const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1200 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);
const card = () => page.locator("section").filter({ hasText: "Flexible Partial Denture" }).first();

async function shot(status, file) {
  if (status) {
    await page.evaluate((s) => {
      const db = JSON.parse(sessionStorage.getItem("rs_mock_db"));
      db.submissions[0].status = s;
      sessionStorage.setItem("rs_mock_db", JSON.stringify(db));
    }, status);
    await page.reload({ waitUntil: "networkidle" });
  }
  await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
  await page.getByText("Delivered", { exact: true }).waitFor({ timeout: 5000 });
  await card().screenshot({ path: `${OUT}/${file}` });
  log(`captured ${file}${status ? ` (status=${status})` : " (default draft)"}`);
}

await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await shot(null, "rail-1-draft.png");        // short gradient (2 stages done)
await shot("in_fabrication", "rail-2-mid.png"); // longer gradient
await shot("completed", "rail-3-full.png");   // full gradient rail

await browser.close();
console.log("VERIFY OK");
