/**
 * Follow-up for pieces the main demo skipped.
 *   node scripts/full-app-demo-extras.mjs
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
  await sleep(800);
}

async function click(loc, label) {
  console.log("  click:", label);
  await loc.first().click({ force: true, timeout: 12000 });
  await sleep(1200);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 700 });
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

  await announce(page, "A · Chatbot — ask a real question");
  await click(page.getByRole("button", { name: /Open chatbot/i }), "Open chatbot");
  await sleep(1000);
  const input = page.locator('input[placeholder*="Ask about events" i]');
  await input.waitFor({ state: "visible", timeout: 8000 });
  await input.fill("What should I do for focus mode today?");
  await click(page.getByRole("button", { name: /Send message/i }), "Send");
  await sleep(7000);
  // Use a suggestion chip too
  const chip = page.locator("button").filter({ hasText: /event|schedule|wellness|focus/i }).first();
  if (await chip.count()) {
    await click(chip, "Suggestion chip");
    await sleep(5000);
  }
  await click(page.getByRole("button", { name: /Close chatbot/i }), "Close chatbot");

  await announce(page, "B · Admin Create Event form (close without saving)");
  const shield = page
    .locator("header button")
    .filter({ has: page.locator(".text-purple-400") });
  await click(shield, "Admin shield");
  await page.getByText(/Admin Dashboard/i).waitFor({ timeout: 10000 });
  await click(page.getByRole("button", { name: /^Events$/i }), "Events");
  await click(page.getByRole("button", { name: /New Event/i }), "New Event");
  await sleep(1000);
  const titleField = page.locator('input[placeholder*="title" i], input').first();
  // Prefer placeholder from form
  const named = page.getByPlaceholder(/title|Event/i).first();
  if (await named.count()) {
    await named.fill("Campus Demo Mixer");
  } else if (await page.locator("input:visible").count()) {
    await page.locator("input:visible").first().fill("Campus Demo Mixer");
  }
  await sleep(1000);
  await page.mouse.wheel(0, 400);
  await sleep(2000);
  // Close via backdrop or header X inside modal
  const modalX = page
    .locator("div")
    .filter({ hasText: /^Create Event$/ })
    .locator("button")
    .first();
  if (await modalX.count()) {
    await click(modalX, "Close Create Event X");
  } else {
    await page.keyboard.press("Escape");
    await sleep(800);
    // click dark backdrop
    await page.mouse.click(20, 40);
  }
  await sleep(1500);

  await announce(page, "C · Access → Add Account modal");
  await click(page.getByRole("button", { name: /^Access$/i }), "Access");
  await sleep(1500);
  await click(page.getByRole("button", { name: /Add Account/i }), "Add Account");
  await sleep(2500);
  await page.keyboard.press("Escape");
  await sleep(800);
  if (await page.getByText(/Create Admin Account/i).isVisible().catch(() => false)) {
    await click(
      page
        .locator("div")
        .filter({ hasText: /Create Admin Account/i })
        .locator("button")
        .first(),
      "Close Add Account",
    );
  }
  await sleep(1500);

  await announce(page, "D · Close admin, back to Home");
  await click(
    page
      .getByText(/Admin Dashboard/i)
      .locator("xpath=preceding::button[1]"),
    "Close admin",
  );
  await sleep(1500);
  await click(page.locator("nav").getByText(/^Home$/i), "Home");
  await sleep(2000);

  await announce(page, "EXTRAS DONE — holding 25s");
  await sleep(25000);
  await browser.close();
  console.log("EXTRAS_DONE");
}

main().catch((e) => {
  console.error("EXTRAS_FAIL", e);
  process.exit(1);
});
