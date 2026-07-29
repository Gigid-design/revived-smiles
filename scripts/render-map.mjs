import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setViewportSize({ width: 1360, height: 1200 });
await page.goto("http://localhost:3000/flow-map.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "public/flow-map.png", fullPage: true });
await browser.close();
console.log("wrote public/flow-map.png");
