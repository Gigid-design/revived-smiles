import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1150 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);
const card = () => page.locator("section").filter({ hasText: "Placed" }).first();

await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
const trigger = page.getByRole("button", { name: "Switch order" });
log(`switcher trigger present = ${await trigger.count()}`);

// open the dropdown
await trigger.click();
const options = page.getByRole("option");
await options.first().waitFor({ timeout: 5000 });
const optTexts = (await options.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
log(`options (${optTexts.length}): ${optTexts.join(" | ")}`);
await card().screenshot({ path: `${OUT}/switcher-1-open.png` });

// select the Nightguard order
await page.getByRole("option", { name: /Nightguard/ }).click();
await page.getByRole("heading", { name: "Nightguard" }).waitFor({ timeout: 5000 });
const headingNow = await page.locator("h2").first().innerText();
log(`after select: header = "${headingNow}"`);
await card().screenshot({ path: `${OUT}/switcher-2-selected.png` });

await browser.close();
console.log("VERIFY OK");
