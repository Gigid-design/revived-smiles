import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const OUT = "public/shots";
const VW = 430, VH = 880;

// Patient app is seeded signed-in; admin needs a login first.
const patientRoutes = [
  ["home", "/"],
  ["forgot-password", "/forgot-password"],
  ["reset-password", "/reset-password"],
  ["dashboard", "/dashboard"],
  ["my-order", "/my-order"],
  ["messages", "/messages"],
  ["order-detail", "/order-detail"],
  ["insurance-claim", "/insurance-claim"],
  ["profile", "/profile"],
  ["notifications", "/notifications"],
  ["intake", "/intake"],
  ["step4", "/step4"],
  ["step5", "/step5"],
  ["photo-intro", "/photo-intro"],
  ["camera", "/camera"],
  ["camera-1", "/camera-1"],
  ["open-bite", "/open-bite"],
  ["open-bite-2", "/open-bite-2"],
  ["intake-complete", "/intake-complete"],
  ["impression-photos", "/impression-photos"],
  ["complete", "/complete"],
];

const adminStaticRoutes = [
  ["admin-login", "/admin/login"],
  ["admin", "/admin"],
  ["admin-submissions", "/admin/submissions"],
  ["admin-prompts", "/admin/prompts"],
  ["admin-prompts-type", "/admin/prompts/close-bite-front"],
];

async function shoot(page, name, url) {
  try {
    await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 20000 });
  } catch {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 20000 });
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("  shot", name, "<-", url);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 2,
    permissions: ["camera"],
  });
  const page = await context.newPage();

  console.log("Patient routes:");
  for (const [name, url] of patientRoutes) await shoot(page, name, url);

  console.log("Admin login:");
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  const email = page.locator('input[type="email"], input[name="email"]').first();
  if (await email.count()) await email.fill("admin@revivedsmiles.com");
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill("password");
  const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();
  if (await submit.count()) {
    await submit.click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  console.log("Admin static routes:");
  for (const [name, url] of adminStaticRoutes) await shoot(page, name, url);

  console.log("Admin submission detail:");
  await page.goto(BASE + "/admin/submissions", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const href = await page
    .locator('a[href^="/admin/submissions/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (href && href !== "/admin/submissions") {
    await shoot(page, "admin-submission-detail", href);
  } else {
    console.log("  (no submission detail link found)");
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
