/**
 * Visible walkthrough — watch the Chromium window.
 * Run: node scripts/live-demo.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL || "http://localhost:5174";
const EMAIL = process.env.DEMO_EMAIL || "danish.admin@taylors.edu.my";
const PASS = process.env.DEMO_PASS || "danish123";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickFirst(page, locators, label) {
  for (const loc of locators) {
    try {
      const el = typeof loc === "string" ? page.locator(loc).first() : loc;
      if (await el.isVisible({ timeout: 2500 })) {
        console.log("Click:", label);
        await el.click();
        return true;
      }
    } catch {
      /* try next */
    }
  }
  console.log("Skip:", label);
  return false;
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 550,
  });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  console.log("Opening", BASE);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(2000);

  // Wait out auth-loading → landing or app
  await page
    .getByText(/Get Started|Recommended for you|Sign In|Campus Email/i)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});

  const onApp = await page
    .getByText(/Recommended for you|Wellness picks/i)
    .first()
    .isVisible()
    .catch(() => false);

  if (!onApp) {
    await clickFirst(
      page,
      [page.getByRole("button", { name: /Get Started/i })],
      "Get Started",
    );
    await sleep(1000);

    const email = page.locator('input[type="email"]').first();
    const password = page.locator('input[type="password"]').first();
    await email.waitFor({ state: "visible", timeout: 15000 });
    await email.fill(EMAIL);
    await password.fill(PASS);
    console.log("Signing in as", EMAIL);
    await page.locator('form button[type="submit"]').first().click();
    await sleep(3500);
  } else {
    console.log("Already signed in — continuing on Home");
  }

  // Ensure Home tab
  await clickFirst(
    page,
    [page.getByRole("button", { name: /^Home$/i }), page.getByText(/^Home$/i)],
    "Home tab",
  );
  await sleep(1500);

  // Interested → personalize (force: cards animate so Playwright sees them as unstable)
  const interestedBtn = page.getByRole("button", { name: /^Interested$/i }).first();
  if (await interestedBtn.count()) {
    console.log("Tapping Interested…");
    await interestedBtn.click({ force: true, timeout: 10000 });
    await sleep(2500);
    console.log("Looking for Because banner…");
    const because = page.getByText(/Because you liked|Why this is recommended/i).first();
    if (await because.isVisible().catch(() => false)) {
      console.log("OK: recommendation reason visible");
    }
  }

  // Open event → RSVP (toast)
  const rsvpChip = page.getByText("Tap for RSVP").first();
  if (await rsvpChip.count()) {
    console.log("Opening event detail…");
    await rsvpChip.click({ force: true });
    await sleep(1500);
    const join = page
      .getByRole("button", { name: /Join|RSVP|I'm Going|Going|Leave/i })
      .first();
    if (await join.count()) {
      console.log("Tapping RSVP…");
      await join.click({ force: true });
      await sleep(2500);
      const toast = page.getByText(/Joined|Left|Focus/i).first();
      if (await toast.isVisible().catch(() => false)) {
        console.log("OK: toast feedback visible");
      }
    }
    await page.keyboard.press("Escape");
    await sleep(800);
  }

  // Scroll to timetable ticker
  console.log("Scrolling schedule ticker…");
  await page.mouse.wheel(0, 500);
  await sleep(3000);

  console.log("Holding window open 25s — watch the UI.");
  await sleep(25000);
  await browser.close();
  console.log("DEMO_DONE");
}

main().catch((err) => {
  console.error("DEMO_FAIL", err);
  process.exit(1);
});
