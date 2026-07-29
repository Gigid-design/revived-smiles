import { chromium } from "playwright";

const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1200 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);
const card = () => page.locator("section").filter({ hasText: "Flexible Partial Denture" }).first();

// 1) Default draft: Care Guide hidden, "Preview delivered state" link visible
await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Flexible Partial Denture" }).waitFor({ timeout: 10000 });
const careHiddenBefore = await page.getByRole("link", { name: /Care Guide/ }).count();
const previewLink = page.getByRole("button", { name: "Preview delivered state" });
log(`draft: Care Guide links = ${careHiddenBefore}; preview link visible = ${await previewLink.isVisible()}`);

// 2) Click preview → delivered active → Care Guide link appears
await previewLink.click();
await page.getByText("Delivered").first().waitFor();
const careLink = page.getByRole("link", { name: "View your Care Guide" });
await careLink.waitFor({ timeout: 5000 });
log(`after preview: Care Guide link visible = ${await careLink.isVisible()}, href = ${await careLink.getAttribute("href")}`);
await card().screenshot({ path: `${OUT}/care-1-tracker-delivered.png` });

// 3) Follow the Care Guide link → care-guide page renders
await careLink.click();
await page.waitForURL("**/care-guide", { timeout: 8000 });
await page.getByRole("heading", { name: "Care Guide" }).waitFor({ timeout: 8000 });
await page.getByText("Clean it daily").waitFor({ timeout: 5000 });
log(`care-guide page loaded at ${new URL(page.url()).pathname}`);
await page.screenshot({ path: `${OUT}/care-2-page.png`, fullPage: true });

// 4) Deep link ?preview=delivered also works
await page.goto(`${BASE}/my-order?preview=delivered`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "View your Care Guide" }).waitFor({ timeout: 8000 });
log("deep link ?preview=delivered: Care Guide link present");

await browser.close();
console.log("VERIFY OK");
