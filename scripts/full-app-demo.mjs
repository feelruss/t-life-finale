/**
 * Full visible walkthrough — student surfaces + admin dashboard.
 * Watch the Chromium window. Takes several minutes.
 *
 *   node scripts/full-app-demo.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL || "http://localhost:5174";
const ADMIN_EMAIL = "danish.admin@taylors.edu.my";
const ADMIN_PASS = "danish123";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function announce(page, title) {
  console.log(`\n=== ${title} ===`);
  await page.evaluate((t) => {
    const id = "demo-banner";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.cssText =
        "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;" +
        "background:#E21836;color:#fff;padding:8px 14px;border-radius:999px;" +
        "font:600 12px/1.2 system-ui;box-shadow:0 8px 24px rgba(0,0,0,.45);" +
        "pointer-events:none;max-width:92vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, title);
  await sleep(900);
}

async function forceClick(locator, label) {
  try {
    if ((await locator.count()) === 0) {
      console.log(`  skip (missing): ${label}`);
      return false;
    }
    console.log(`  click: ${label}`);
    await locator.first().click({ force: true, timeout: 12000 });
    await sleep(1200);
    return true;
  } catch (err) {
    console.log(`  fail: ${label} — ${err.message.split("\n")[0]}`);
    return false;
  }
}

async function scrollMain(page, dy = 400) {
  const main = page.locator("main").first();
  if (await main.count()) {
    await main.evaluate((el, y) => el.scrollBy(0, y), dy);
  } else {
    await page.mouse.wheel(0, dy);
  }
  await sleep(1400);
}

async function goTab(page, name) {
  // Bottom nav buttons contain the label text
  const tab = page.locator("nav").getByText(new RegExp(`^${name}$`, "i")).first();
  await forceClick(tab, `${name} tab`);
  await sleep(800);
}

async function ensureLoggedOut(page) {
  const logout = page.getByRole("button", { name: /Logout/i }).first();
  if (await logout.count()) {
    await forceClick(logout, "Logout");
    await sleep(2000);
  }
}

async function login(page, email, password) {
  await page
    .getByText(/Get Started|Sign In|Campus Email|Recommended for you/i)
    .first()
    .waitFor({ timeout: 25000 })
    .catch(() => {});

  if (
    await page
      .getByText(/Recommended for you|Wellness picks|Current mode/i)
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    console.log("  already in app");
    return;
  }

  if (await page.getByRole("button", { name: /Get Started/i }).count()) {
    await forceClick(
      page.getByRole("button", { name: /Get Started/i }),
      "Get Started",
    );
  }

  await page.locator('input[type="email"]').first().waitFor({ timeout: 15000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await forceClick(page.locator('form button[type="submit"]'), "Sign In submit");
  await page
    .getByText(/Current mode|Recommended for you|Welcome/i)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  await sleep(2000);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 650,
    args: ["--start-maximized"],
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 920 },
  });
  const page = await context.newPage();

  console.log("FULL APP DEMO — watch the Chromium window");
  console.log("Opening", BASE);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(2500);

  // ── Landing ──────────────────────────────────────────────
  await announce(page, "1 · Landing page (campus ads reel)");
  await sleep(3500);
  await forceClick(
    page.getByRole("button", { name: /Get Started/i }),
    "Get Started",
  );

  // ── Forgot password UI ───────────────────────────────────
  await announce(page, "2 · Forgot password screen");
  await forceClick(
    page.getByRole("button", { name: /Forgot password/i }),
    "Forgot password",
  );
  await sleep(2500);
  await forceClick(
    page.getByRole("button", { name: /Back to Sign In/i }),
    "Back to Sign In",
  );

  // ── Login as admin (uses full student UI + admin) ─────────
  await announce(page, "3 · Sign in (Danish admin)");
  await login(page, ADMIN_EMAIL, ADMIN_PASS);

  // ── HOME as student ──────────────────────────────────────
  await announce(page, "4 · HOME — timetable ticker");
  await goTab(page, "Home");
  await scrollMain(page, 180);
  await sleep(2500);

  await announce(page, "5 · HOME — Focus meter Refresh");
  await forceClick(
    page.getByRole("button", { name: /Refresh|Analyzing/i }),
    "AI meter Refresh",
  );
  await sleep(3500);

  await announce(page, "6 · HOME — switch Focus ↔ Balance");
  // ModeToggle clicks the whole track (labels include emoji so exact text fails)
  const modeTrack = page
    .locator("div.cursor-pointer")
    .filter({ hasText: /Focus/ })
    .filter({ hasText: /Balance/ })
    .first();
  await forceClick(modeTrack, "Toggle → Balance");
  await sleep(2200);
  await forceClick(modeTrack, "Toggle → Focus");
  await sleep(1500);

  await announce(page, "7 · HOME — Interested / Not interested");
  await scrollMain(page, 500);
  await forceClick(
    page.getByRole("button", { name: /^Interested$/i }),
    "Interested",
  );
  await sleep(2000);
  await forceClick(
    page.getByRole("button", { name: /^Not interested$/i }),
    "Not interested",
  );
  await sleep(1200);
  await forceClick(page.getByRole("button", { name: /^Undo$/i }), "Undo hide");

  await announce(page, "8 · HOME — open event + RSVP toast");
  await forceClick(page.getByText("Tap for RSVP"), "Open event card");
  await sleep(1500);
  const rsvpBtn = page.getByRole("button", {
    name: /RSVP Now|Cancel RSVP|Event Full|Updating/i,
  });
  if (await rsvpBtn.count()) {
    const label = (await rsvpBtn.first().innerText()).trim();
    if (/RSVP Now/i.test(label)) {
      await forceClick(rsvpBtn, "RSVP Now");
      await sleep(2800);
    } else if (/Cancel RSVP/i.test(label)) {
      await forceClick(rsvpBtn, "Cancel RSVP (then re-join)");
      await sleep(2000);
      await forceClick(
        page.getByRole("button", { name: /RSVP Now/i }),
        "RSVP Now again",
      );
      await sleep(2500);
    }
  }
  await page.keyboard.press("Escape");
  await sleep(1000);

  // ── Notifications ────────────────────────────────────────
  await announce(page, "9 · Notifications");
  // Admin header: [0]=shield, [1]=bell
  const headerBtns = page.locator("header button");
  const bellIndex = (await headerBtns.count()) > 1 ? 1 : 0;
  await forceClick(headerBtns.nth(bellIndex), "Bell / notifications");
  await sleep(2800);
  if (await page.getByRole("button", { name: /Mark all/i }).count()) {
    await forceClick(
      page.getByRole("button", { name: /Mark all/i }),
      "Mark all read",
    );
  }
  await page.keyboard.press("Escape");
  await sleep(800);

  // ── Schedule ─────────────────────────────────────────────
  await announce(page, "10 · SCHEDULE — Academic Timeline");
  await goTab(page, "Schedule");
  await sleep(2000);
  // Label is text, not a button — pause so the ticker/timeline is visible
  if (await page.getByText(/Academic Timeline|Event Calendar/i).count()) {
    console.log("  visible: schedule week header");
  }
  await forceClick(
    page.getByRole("button", { name: /Next week/i }),
    "Next week",
  );
  await sleep(1500);
  await forceClick(
    page.getByRole("button", { name: /Previous week/i }),
    "Previous week",
  );
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
    const dayBtn = page.getByRole("button", { name: new RegExp(day, "i") }).first();
    if (await dayBtn.count()) {
      await forceClick(dayBtn, `Day ${day}`);
      break;
    }
  }
  await scrollMain(page, 350);
  await sleep(2000);
  await forceClick(
    page.getByRole("button", { name: /Next week/i }),
    "Browse another week",
  );
  await sleep(2000);

  // ── Explore ──────────────────────────────────────────────
  await announce(page, "11 · EXPLORE — clubs");
  await goTab(page, "Explore");
  await sleep(2000);
  const search = page.locator('input[type="search"], input[placeholder*="Search" i]').first();
  if (await search.count()) {
    await search.fill("tech");
    await sleep(1500);
    await search.fill("");
    await sleep(800);
  }
  await forceClick(
    page.getByRole("button", { name: /^Join$/i }),
    "Join a club",
  );
  await sleep(1500);
  await forceClick(page.locator("main h2, main h3").first(), "Open club details");
  await sleep(2500);
  await page.keyboard.press("Escape");
  await sleep(800);

  // ── Profile ──────────────────────────────────────────────
  await announce(page, "12 · PROFILE — stats & privacy");
  await goTab(page, "Profile");
  await sleep(1500);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);

  // ── Chatbot ──────────────────────────────────────────────
  await announce(page, "13 · AI Chatbot");
  await goTab(page, "Home");
  await sleep(800);
  const fab = page.locator("div.fixed.bottom-24 >> button").last();
  await forceClick(fab, "Open chatbot");
  const chatInput = page
    .locator('input[placeholder*="Ask" i], textarea[placeholder*="Ask" i]')
    .first();
  if (await chatInput.count()) {
    await chatInput.click({ force: true });
    await chatInput.fill("Suggest one focus event for me today");
    await sleep(600);
    // Send icon button (aria-label="Send message")
    await forceClick(
      page.getByRole("button", { name: /Send message|Send/i }),
      "Send chat",
    );
    await sleep(6000);
  }
  await forceClick(fab, "Close chatbot");
  await sleep(800);

  // ── ADMIN DASHBOARD ──────────────────────────────────────
  await announce(page, "14 · ADMIN — open dashboard (shield)");
  await goTab(page, "Home");
  await sleep(1000);
  const shield = page
    .locator("header button")
    .filter({ has: page.locator(".text-purple-400") })
    .first();
  let adminOpen = false;
  for (let attempt = 1; attempt <= 3 && !adminOpen; attempt++) {
    await forceClick(shield, `Admin shield (try ${attempt})`);
    adminOpen = await page
      .getByText(/Admin Dashboard/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }
  if (!adminOpen) {
    // Last resort: click any purple-bordered header control
    await forceClick(
      page.locator("header button.bg-purple-500\\/10, header button").first(),
      "Admin shield fallback",
    );
    adminOpen = await page
      .getByText(/Admin Dashboard/i)
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
  }
  if (!adminOpen) {
    throw new Error("Could not open Admin Dashboard — shield control missing?");
  }
  await sleep(2000);

  await announce(page, "15 · ADMIN — Overview analytics");
  await forceClick(page.getByRole("button", { name: /^Overview$/i }), "Overview");
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(2000);
  await scrollMain(page, 400);
  await sleep(1500);

  await announce(page, "16 · ADMIN — Events + filters");
  await forceClick(page.getByRole("button", { name: /^Events$/i }), "Events section");
  await sleep(1500);
  await forceClick(page.getByRole("button", { name: /^Focus$/i }), "Filter Focus");
  await sleep(1200);
  await forceClick(page.getByRole("button", { name: /^Balance$/i }), "Filter Balance");
  await sleep(1200);
  await forceClick(page.getByRole("button", { name: /^All$/i }), "Filter All");
  await sleep(1200);

  await announce(page, "17 · ADMIN — Create Event form (preview, no save)");
  await forceClick(page.getByRole("button", { name: /New Event/i }), "New Event");
  await sleep(1500);
  // Fill title if visible
  const titleInput = page.locator('input[placeholder*="title" i], input').filter({ hasText: "" }).first();
  // Better: look for labeled fields in modal
  const modal = page.getByText(/Create Event|Edit Event/i).first();
  if (await modal.isVisible().catch(() => false)) {
    const inputs = page.locator("input:visible");
    const count = await inputs.count();
    if (count > 0) {
      await inputs.nth(0).fill("Demo Walkthrough Event");
      await sleep(800);
    }
    // Pick Focus / Balance chips if present
    await forceClick(
      page.getByRole("button", { name: /^Focus$/i }),
      "Focus category chip",
    );
    await forceClick(
      page.getByRole("button", { name: /Technology|Career|Wellness|Social/i }),
      "Topic tag chip",
    );
    await sleep(1500);
    // Scroll to match preview
    await page.mouse.wheel(0, 300);
    await sleep(2000);
    // Close without creating — look for Cancel / X
    await forceClick(
      page.getByRole("button", { name: /Cancel|Close/i }),
      "Cancel create",
    );
    // If still open, press Escape
    await page.keyboard.press("Escape");
    await sleep(800);
    // Click X near Create Event header if needed
    if (await page.getByText(/Create Event/i).isVisible().catch(() => false)) {
      await forceClick(
        page.locator("button").filter({ has: page.locator("svg") }).first(),
        "Close create modal X",
      );
    }
  }

  await announce(page, "18 · ADMIN — Burnout telemetry");
  await forceClick(page.getByRole("button", { name: /^Burnout$/i }), "Burnout");
  await sleep(2000);
  await scrollMain(page, 450);
  await sleep(2500);

  await announce(page, "19 · ADMIN — Access / RBAC");
  await forceClick(page.getByRole("button", { name: /^Access$/i }), "Access");
  await sleep(2000);
  await scrollMain(page, 300);
  await sleep(1500);
  await forceClick(
    page.getByRole("button", { name: /Create Admin|Add User|Invite/i }),
    "Open Create Admin Account",
  );
  await sleep(2500);
  await page.keyboard.press("Escape");
  await forceClick(
    page.getByRole("button", { name: /Cancel|Close/i }),
    "Close create-user modal",
  );
  await sleep(1000);

  await announce(page, "20 · Back to student Home");
  // X button sits left of "Admin Dashboard" title
  await forceClick(
    page
      .getByText(/Admin Dashboard/i)
      .locator("xpath=ancestor::div[contains(@class,'flex')][1]//button")
      .first(),
    "Close admin (X)",
  );
  await sleep(1500);
  if (await page.getByText(/Admin Dashboard/i).first().isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await forceClick(
      page.locator("button").filter({ has: page.locator("svg") }).first(),
      "Admin close retry",
    );
  }
  await goTab(page, "Home");
  await sleep(1500);

  await announce(page, "21 · Final tour — scroll Home feed");
  await scrollMain(page, 200);
  await sleep(1500);
  await scrollMain(page, 500);
  await sleep(2500);

  await announce(page, "DONE — holding window open 40s for you");
  console.log("\nDemo complete. Window stays open 40 seconds.");
  await sleep(40000);

  await browser.close();
  console.log("FULL_DEMO_DONE");
}

main().catch((err) => {
  console.error("FULL_DEMO_FAIL", err);
  process.exit(1);
});
