/**
 * Visible demo of the latest Home / Schedule / Profile fixes.
 *   node scripts/demo-latest-fixes.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL || "http://localhost:5174";
const EMAIL = "danish.admin@taylors.edu.my";
const PASS = "danish123";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function announce(page, title) {
  console.log(`\n=== ${title} ===`);
  await page.evaluate((t) => {
    let el = document.getElementById("demo-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-banner";
      el.style.cssText =
        "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;" +
        "background:#E21836;color:#fff;padding:8px 14px;border-radius:999px;" +
        "font:600 12px/1.2 system-ui;pointer-events:none;max-width:92vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, title);
  await sleep(1000);
}

async function click(loc, label) {
  console.log("  click:", label);
  await loc.first().click({ force: true, timeout: 12000 });
  await sleep(1400);
}

async function clickTab(page, name) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(300);
  const clicked = await page.evaluate((tabName) => {
    const buttons = [...document.querySelectorAll("nav button, button")];
    const match = buttons.find((b) =>
      (b.textContent || "").toLowerCase().includes(tabName.toLowerCase()),
    );
    if (!match) return false;
    match.click();
    return true;
  }, name);
  console.log(clicked ? `  click: ${name} tab` : `  skip: ${name} tab`);
  await sleep(1400);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 600,
    channel: "chrome", // use installed Google Chrome when Playwright browser cache is missing
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 920 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(2000);

  if (await page.getByRole("button", { name: /Get Started/i }).count()) {
    await click(page.getByRole("button", { name: /Get Started/i }), "Get Started");
  }
  if (await page.locator('input[type="email"]').count()) {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASS);
    await click(page.locator('form button[type="submit"]'), "Sign In");
    await sleep(2500);
  }

  await announce(page, "1 · Home — 5 diverse topics + overall match %");
  await clickTab(page, "Home");
  await page.mouse.wheel(0, 500);
  await sleep(2500);
  await page.mouse.wheel(0, 400);
  await sleep(2000);

  await announce(page, "2 · Tap Interested — match % should move");
  await click(page.getByRole("button", { name: /^Interested$/i }), "Interested");
  await sleep(2500);

  await announce(page, "3 · Open event — future date + RSVP");
  await click(page.getByText("Tap for RSVP").first(), "Open card");
  await sleep(1500);
  if (await page.getByRole("button", { name: /RSVP Now/i }).count()) {
    await click(page.getByRole("button", { name: /RSVP Now/i }), "RSVP");
    await sleep(2200);
  }
  await page.keyboard.press("Escape");
  await sleep(1000);
  await page.keyboard.press("Escape");
  await sleep(800);

  await announce(page, "4 · Schedule — all upcoming RSVPs + dates");
  await clickTab(page, "Schedule");
  await sleep(3000);
  await page.mouse.wheel(0, 300);
  await sleep(2000);

  await announce(page, "5 · Profile — attended/hours note (check-in, not RSVP)");
  await page.keyboard.press("Escape");
  await sleep(400);
  await clickTab(page, "Profile");
  await sleep(3000);

  await announce(page, "DONE — holding 30s so you can inspect");
  await sleep(30000);
  await browser.close();
  console.log("FIXES_DEMO_DONE");
}

main().catch((e) => {
  console.error("FIXES_DEMO_FAIL", e);
  process.exit(1);
});
