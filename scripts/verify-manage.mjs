import { chromium } from "playwright";

const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 920 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);

await page.goto(`${BASE}/manage-subscription`, { waitUntil: "networkidle" });
await page.getByText("Whitening Gel Refill").waitFor({ timeout: 10000 });
await page.getByText("Visa ending 4242").waitFor({ timeout: 5000 });
log("loaded: current plan + Visa ending 4242 visible");
await page.screenshot({ path: `${OUT}/manage-1-overview.png` });

// Change plan → Monthly refill
await page.getByRole("button", { name: "Change plan" }).first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("button", { name: /Monthly refill/ }).click();
await page.getByRole("button", { name: "Switch plan" }).click();
await page.getByText("every 4 weeks").waitFor({ timeout: 8000 });
const meta = await page.locator("p", { hasText: "every 4 weeks" }).first().innerText();
log(`plan changed → "${meta.trim()}"`);
await page.screenshot({ path: `${OUT}/manage-2-planchanged.png` });

// Change card
await page.getByRole("button", { name: "Change" }).first().click();
await page.getByRole("dialog").waitFor();
await page.fill("#cc-number", "5555 5555 5555 4444");
await page.fill("#cc-exp", "05/29");
await page.fill("#cc-cvc", "123");
await page.getByRole("button", { name: "Save card" }).click();
await page.getByText("Mastercard ending 4444").waitFor({ timeout: 8000 });
log("card updated → Mastercard ending 4444");

// Cancel subscription
await page.getByRole("button", { name: "Cancel subscription" }).first().click();
await page.getByRole("dialog").waitFor();
await page.getByRole("dialog").getByRole("button", { name: "Cancel subscription" }).click();
await page.getByText("Canceled").first().waitFor({ timeout: 8000 });
log("cancel confirmed → badge shows Canceled");
await page.screenshot({ path: `${OUT}/manage-3-canceled.png` });

await browser.close();
console.log("VERIFY OK");
