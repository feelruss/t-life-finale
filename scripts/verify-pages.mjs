import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    channel: "chrome",
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 920 } });
  page.on("pageerror", (err) => console.log("PAGE_ERROR", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE_ERROR", msg.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await sleep(1500);

  if (await page.getByRole("button", { name: /Get Started/i }).count()) {
    await page.getByRole("button", { name: /Get Started/i }).click({ force: true });
    await sleep(800);
  }
  if (await page.locator('input[type="email"]').count()) {
    await page.locator('input[type="email"]').fill("danish.admin@taylors.edu.my");
    await page.locator('input[type="password"]').fill("danish123");
    await page.locator('form button[type="submit"]').click({ force: true });
    await sleep(3000);
  }

  for (const name of ["Home", "Schedule", "Explore", "Profile"]) {
    await page.evaluate((tabName) => {
      const btn = [...document.querySelectorAll("nav button")].find((b) =>
        (b.textContent || "").includes(tabName),
      );
      btn?.click();
    }, name);
    await sleep(2000);
    const text = await page.locator("main").innerText().catch(() => "");
    const len = text.trim().length;
    console.log(`TAB ${name}: chars=${len} sample=${JSON.stringify(text.slice(0, 120))}`);
    await page.screenshot({
      path: `scripts/verify-${name.toLowerCase()}.png`,
      fullPage: false,
    });
  }

  // Balance mode
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("nav button")].find((b) =>
      (b.textContent || "").includes("Home"),
    );
    btn?.click();
  });
  await sleep(800);
  await page.evaluate(() => {
    const track = [...document.querySelectorAll("div.cursor-pointer")].find(
      (el) => (el.textContent || "").includes("Balance"),
    );
    track?.click();
  });
  await sleep(2000);
  const balanceText = await page.locator("main").innerText().catch(() => "");
  console.log(
    `BALANCE: chars=${balanceText.trim().length} hasPicks=${balanceText.includes("Wellness") || balanceText.includes("Match")}`,
  );
  await page.screenshot({ path: "scripts/verify-balance.png", fullPage: false });

  console.log("VERIFY_DONE");
  await sleep(8000);
  await browser.close();
}

main().catch((e) => {
  console.error("VERIFY_FAIL", e);
  process.exit(1);
});
