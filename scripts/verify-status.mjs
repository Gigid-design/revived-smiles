import { chromium } from "playwright";

const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1200 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);
const card = () => page.locator("section").filter({ hasText: "Flexible Partial Denture" }).first();

// 1) In-progress (draft): permanent indicator present, not active, no demo button
await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
const indicator = card().getByRole("link").filter({ hasText: /Delivery in progress|Delivered/ });
await indicator.first().waitFor({ timeout: 5000 });
log(`in-progress: indicator text = "${(await indicator.first().innerText()).replace(/\n/g, " ")}"`);
log(`in-progress: demo 'Preview delivered state' button present = ${await page.getByRole("button", { name: "Preview delivered state" }).count()}`);
await card().screenshot({ path: `${OUT}/status-1-inprogress.png` });

// 2) Delivered (via permanent ?preview deep link): indicator active + Care Guide
await page.goto(`${BASE}/my-order?preview=delivered`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
const active = card().getByRole("link").filter({ hasText: "Delivered" });
await active.first().waitFor({ timeout: 5000 });
log(`delivered: indicator text = "${(await active.first().innerText()).replace(/\n/g, " ")}"`);
log(`delivered: Care Guide link present = ${await page.getByRole("link", { name: "View your Care Guide" }).count()}`);
await card().screenshot({ path: `${OUT}/status-2-delivered.png` });

await browser.close();
console.log("VERIFY OK");
