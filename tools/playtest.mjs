// Automated playtest of the built game: level 1 must be clearable with one shift (two queued shoves).
// Usage: node tools/playtest.mjs <baseUrl> <outDir>. Exit 0 = cleared, 1 = not cleared, 2 = could not run.
import { chromium } from "file:///D:/dark-matters/engine/node_modules/playwright/index.mjs";
import fs from "node:fs";
const BASE = process.argv[2] || "http://127.0.0.1:4173", OUT = process.argv[3] || "D:/tmp/sg-playtest";
fs.mkdirSync(OUT, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: false, args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--window-size=1280,800"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.message))); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => !!window.__sg, null, { timeout: 60000 });
  await page.screenshot({ path: OUT + "/0-title.png" });
  await page.click("#start");
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => window.__sg.targetsLeft);
  await page.keyboard.down("Shift");
  await page.waitForTimeout(300);
  const frozen = await page.evaluate(() => window.__sg.frozen);
  // click each red target via its projected screen point
  const targets = await page.evaluate(() => window.__sg.targetScreen());
  for (const p of targets) { await page.mouse.click(p.x, p.y); await page.waitForTimeout(120); }
  const queued = await page.evaluate(() => window.__sg.queue);
  await page.screenshot({ path: OUT + "/1-frozen-queued.png" });
  await page.keyboard.up("Shift");
  await page.waitForTimeout(600);
  const slowScale = await page.evaluate(() => window.__sg.scale);
  await page.waitForTimeout(5000);
  const after = await page.evaluate(() => window.__sg.targetsLeft);
  await page.screenshot({ path: OUT + "/2-after.png" });
  const rep = { before, frozen, targets: targets.length, queued, slowScale: +slowScale.toFixed(2), after, errs };
  fs.writeFileSync(OUT + "/report.json", JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep));
  await browser.close();
  process.exit(after === 0 && frozen && queued === targets.length && !errs.length ? 0 : 1);
} catch (e) { console.error("could not run:", e.message); try { await browser?.close(); } catch {} process.exit(2); }
