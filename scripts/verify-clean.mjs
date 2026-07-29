import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1150 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const card = () => page.locator("section").filter({ hasText: "Flexible Partial Denture" }).first();
// in-progress: no indicator, no delivered link
await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
console.log("  in-progress: 'Delivery in progress' present =", await page.getByText("Delivery in progress").count());
await card().screenshot({ path: `${OUT}/clean-1-inprogress.png` });
// delivered via ?preview: no indicator, Care Guide link present
await page.goto(`${BASE}/my-order?preview=delivered`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
console.log("  delivered: 'Delivery in progress' present =", await page.getByText("Delivery in progress").count());
console.log("  delivered: 'Delivered ACTIVE' indicator present =", await page.getByText(/^Delivered$/).count() - 1, "(tracker label only)");
console.log("  delivered: Care Guide link present =", await page.getByRole("link", { name: "View your Care Guide" }).count());
await card().screenshot({ path: `${OUT}/clean-2-delivered.png` });
await browser.close();
console.log("VERIFY OK");
