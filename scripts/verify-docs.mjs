import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-gigic-Downloads-revived-smiles-main/667838ce-d43d-4f28-a363-dc25f27360d0/scratchpad";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const log = (m) => console.log("  " + m);

// From my-order: select Review completed order, click View order → my-documents
await page.goto(`${BASE}/my-order`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Switch order" }).click();
await page.getByRole("option", { name: /Review completed/ }).click();
const viewLink = page.getByRole("link", { name: "View order" });
log(`View order href = ${await viewLink.getAttribute("href")}`);
await viewLink.click();
await page.waitForURL("**/my-documents**", { timeout: 8000 });
await page.getByRole("heading", { name: "My Documents" }).waitFor({ timeout: 8000 });
await page.getByText("About you").waitFor({ timeout: 5000 });
log(`landed at ${new URL(page.url()).pathname}${new URL(page.url()).search}`);
const closeImgs = await page.locator("section", { hasText: "Close bite photos" }).locator("img").count();
const openImgs = await page.locator("section", { hasText: "Open bite photos" }).locator("img").count();
log(`close bite photos = ${closeImgs}, open bite photos = ${openImgs}`);
const brokenImgs = await page.locator("img").evaluateAll((imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).length);
log(`broken images = ${brokenImgs}`);
await page.screenshot({ path: `${OUT}/docs-1-page.png`, fullPage: true });

// Lightbox
await page.locator(".", { hasText: "" }); // noop
await page.getByRole("button", { name: /Close bite photos — Front/ }).click();
await page.getByRole("dialog").waitFor({ timeout: 5000 });
log("lightbox opened on Front photo");
await page.screenshot({ path: `${OUT}/docs-2-lightbox.png` });

await browser.close();
console.log("VERIFY OK");
