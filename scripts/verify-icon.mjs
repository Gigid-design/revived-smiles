import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1100 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
// Dashboard Customer Service card
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
const cs = page.locator("section", { hasText: "Customer Service" }).first();
await cs.waitFor({ timeout: 10000 });
await cs.scrollIntoViewIfNeeded();
await cs.screenshot({ path: `${OUT}/icon-1-customer-service.png` });
// My Orders Protection card
await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
const prot = page.locator("section", { hasText: "Protection" }).first();
await prot.waitFor({ timeout: 10000 });
await prot.scrollIntoViewIfNeeded();
await prot.screenshot({ path: `${OUT}/icon-2-protection.png` });
await browser.close();
console.log("OK");
