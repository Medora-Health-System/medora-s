/**
 * Local MEDUI.INP.2D bedside click-path. Not a product module.
 * Uses system Chrome + puppeteer-core. Does not disable MFA.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.UAT_PUPPETEER ?? "puppeteer-core");

const WEB = process.env.UAT_WEB_BASE ?? "http://localhost:3002";
const FACILITY = process.env.UAT_FACILITY_ID ?? "4687866b-a30e-4123-b02a-2287d6518bf0";
const ENCOUNTER = process.env.UAT_ENCOUNTER_ID ?? "9c1296eb-c7a6-403c-96a2-b81f16205e82";
const PASSWORD = process.env.UAT_PASSWORD ?? "MedoraAdmin123!";
const CHROME =
  process.env.UAT_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.env.UAT_SCREENSHOT_DIR ?? "/tmp/inp2d-uat";

mkdirSync(OUT, { recursive: true });

const results = {};
const marPosts = [];

function shot(page, name) {
  return page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=1400,900"],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(25000);
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("medication-administrations")) {
      marPosts.push({ url: req.url(), method: req.method(), from: page.url() });
    }
  });

  await page.goto(`${WEB}/login`, { waitUntil: "networkidle2" });
  const loginHtmlLang = await page.$eval("html", (el) => el.getAttribute("lang"));
  await page.evaluate(() => {
    window.localStorage.setItem("medora_locale", "en");
  });
  await page.reload({ waitUntil: "networkidle2" });
  const enText = await page.evaluate(() => document.body.innerText);
  results.loginEnglishToggle = /Sign in|Password/i.test(enText) ? "PASS" : `FAIL ${enText.slice(0, 80)}`;
  await page.evaluate(() => {
    window.localStorage.setItem("medora_locale", "fr");
    const b = [...document.querySelectorAll("button")].find((x) =>
      /français|french|^fr$/i.test(x.textContent || "")
    );
    b?.click();
  });
  await sleep(500);
  const frText = await page.evaluate(() => document.body.innerText);
  results.loginFrenchToggle = /Se connecter/.test(frText) ? "PASS" : `FAIL ${frText.slice(0, 160)}`;
  results.loginPageLang = loginHtmlLang === "fr" || /Se connecter/.test(frText) ? "PASS" : `FAIL lang=${loginHtmlLang}`;
  results.loginFrenchCopy = /Se connecter/.test(frText) ? "PASS" : "FAIL";
  await shot(page, "login-fr");

  const loginJson = await page.evaluate(async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username: email, password }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, "rn@medora.local", PASSWORD);
  results.loginHttp = String(loginJson.status);
  results.loginBodyKeys = Object.keys(loginJson.body || {}).join(",");
  if (loginJson.body?.mfaRequired) {
    results.rnLogin = "FAIL unexpected MFA for RN";
  } else if (loginJson.status >= 200 && loginJson.status < 300 && !loginJson.body?.mfaRequired) {
    await page.goto(`${WEB}/app`, { waitUntil: "networkidle2" });
    await sleep(2000);
    results.rnLogin = page.url().includes("/login")
      ? `FAIL cookie session not accepted ${page.url()}`
      : `PASS ${page.url()}`;
  } else {
    results.rnLogin = `FAIL login ${loginJson.status} ${JSON.stringify(loginJson.body).slice(0, 240)}`;
  }
  await shot(page, "after-rn-login");

  const switched = await page.evaluate(async (facilityId) => {
    const res = await fetch("/api/auth/facility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ facilityId }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, FACILITY);
  results.facilitySwitchHttp = String(switched.status);
  if (switched.status >= 200 && switched.status < 300) {
    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector("select", { timeout: 30000 }).catch(() => null);
    await sleep(1500);
    results.facilityHaiti = "PASS";
  } else {
    const selectVal = await page.$eval("select", (el) => el.value).catch(() => "");
    results.facilityHaiti =
      selectVal === FACILITY ? "PASS" : `FAIL switch ${switched.status} select=${selectVal}`;
  }

  async function waitForWorkspace(page) {
    const started = Date.now();
    while (Date.now() - started < 45000) {
      const text = await page.evaluate(() => document.body?.innerText || "");
      if (
        /Revoir les ordonnances|Review Orders|inpatient-review-orders|Retour|Back to census|census|MAR|Admission/i.test(
          text
        ) &&
        !/^[\s\S]*Loading\.\.\.[\s\S]*$/.test(text.trim())
      ) {
        if (!/^Loading\.\.\.$/.test(text.trim()) && text.length > 80) return text;
      }
      if (await page.$('[data-testid="inpatient-review-orders-panel"]')) {
        return text;
      }
      if (await page.$("select")) {
        if (text.includes("Revoir") || text.includes("Review Orders") || text.includes("Admission")) return text;
      }
      await sleep(1000);
    }
    return await page.evaluate(() => document.body?.innerText || "");
  }

  const nursingOrders = `${WEB}/app/hospitalisation/inpatient/active/${ENCOUNTER}/nursing?section=orders`;
  await page.goto(nursingOrders, { waitUntil: "domcontentloaded" });
  const workspaceText = await waitForWorkspace(page);
  results.nursingOrdersUrl = page.url();
  results.workspaceTextSample = workspaceText.slice(0, 400);
  results.consoleErrors = consoleErrors.slice(0, 8);
  await shot(page, "rn-nursing-orders");

  if (!(await page.$('[data-testid="inpatient-review-orders-panel"]'))) {
    for (const btn of await page.$$("button, a")) {
      const label = await page.evaluate((el) => el.textContent?.trim() || "", btn);
      if (/Revoir les ordonnances|Review Orders|📝/.test(label)) {
        await btn.click();
        await sleep(2000);
        break;
      }
    }
  }

  let panel = await page.$('[data-testid="inpatient-review-orders-panel"]');
  if (!panel) {
    const bareOrders = `${WEB}/app/hospitalisation/inpatient/active/${ENCOUNTER}?section=orders`;
    await page.goto(bareOrders, { waitUntil: "networkidle2" });
    await sleep(2500);
    panel = await page.$('[data-testid="inpatient-review-orders-panel"]');
    results.ordersRouteFallback = page.url();
    await shot(page, "rn-orders-fallback");
  }

  const body = await page.evaluate(() => document.body.innerText);
  results.reviewOrdersPanel = panel ? "PASS" : `FAIL missing panel ${body.slice(0, 240)}`;
  results.haitiFrenchTitle = /Revoir les ordonnances/.test(body) ? "PASS" : "FAIL";
  results.haitiFrenchMarBoundary = /administration des médicaments se documente dans le MAR/i.test(body)
    ? "PASS"
    : "FAIL";
  results.viewedNotCompleteCopy = /Consulter une ordonnance ne la termine pas/.test(body) ? "PASS" : "FAIL";
  results.bucketsVisible =
    /Nouvelles \/ non revues/.test(body) &&
    /Actives/.test(body) &&
    /À faire/.test(body) &&
    /En retard/.test(body) &&
    /Planifiées/.test(body) &&
    /Suspendues/.test(body) &&
    /Arrêtées \/ annulées/.test(body) &&
    /Terminées/.test(body) &&
    /STAT \/ urgent/.test(body)
      ? "PASS"
      : "FAIL";
  results.groupsVisible =
    /Médicaments/.test(body) && /Laboratoire/.test(body) && /Soins infirmiers/.test(body)
      ? "PASS"
      : "FAIL";
  results.notEdCockpit = /trauma|ER_ADMINISTER_ONLY/i.test(body) ? "FAIL still ED chrome" : "PASS";

  const ackBefore = marPosts.length;
  let ackClicked = false;
  for (const btn of await page.$$("button")) {
    const label = await page.evaluate((el) => el.textContent?.trim() || "", btn);
    if (label === "Accuser réception") {
      await btn.click();
      ackClicked = true;
      await sleep(1500);
      break;
    }
  }
  results.rnAckClick = ackClicked ? "PASS" : "WARN no acknowledge button visible (filter/empty)";
  results.ackClickDidNotPostMar = marPosts.length === ackBefore ? "PASS" : `FAIL ${JSON.stringify(marPosts)}`;

  for (const btn of await page.$$("button")) {
    const label = await page.evaluate((el) => el.textContent?.trim() || "", btn);
    if (label.startsWith("Toutes") || label === "All") {
      await btn.click();
      await sleep(800);
      break;
    }
  }

  const cancelButtons = await page.$$('[data-testid^="inpatient-review-order-cancel-"]');
  results.rnProviderCancelHidden =
    cancelButtons.length === 0
      ? "PASS no cancel/Annuler on RN Review Orders lines"
      : `WARN ${cancelButtons.length} cancel control(s) — may be RN-owned ORDERED lines`;
  const holdChrome = await page.evaluate(() => document.body.innerText);
  results.rnProviderHoldHidden = /Gérer le médicament/.test(holdChrome)
    ? "FAIL RN saw medication hold/DC chrome"
    : "PASS";

  const openMarBefore = marPosts.length;
  let openMarClicked = false;
  for (const btn of await page.$$("button")) {
    const label = await page.evaluate((el) => el.textContent?.replace(/\s+/g, " ").trim() || "", btn);
    if (/Ouvrir le MAR|Open MAR/i.test(label)) {
      await btn.click();
      openMarClicked = true;
      await sleep(2500);
      break;
    }
  }
  results.openMarClick = openMarClicked ? "PASS" : "WARN no Open MAR (no ADMINISTER_CHART line in view)";
  results.openMarDidNotPostMar =
    marPosts.length === openMarBefore ? "PASS" : `FAIL ${JSON.stringify(marPosts)}`;
  if (openMarClicked) {
    const marText = await page.evaluate(() => document.body.innerText);
    results.openMarNavigated =
      /section=medications|section=mar/i.test(page.url()) || /MAR|administration/i.test(marText)
        ? "PASS"
        : `FAIL url=${page.url()}`;
    await shot(page, "rn-open-mar");
    await page.goto(nursingOrders, { waitUntil: "domcontentloaded" });
    await waitForWorkspace(page);
  }

  const createBtn = await page.$('[data-testid="inpatient-review-orders-create"]');
  if (!createBtn && panel) {
    await page.goto(nursingOrders, { waitUntil: "networkidle2" });
    await sleep(1500);
  }
  const create = await page.$('[data-testid="inpatient-review-orders-create"]');
  if (create) {
    await create.click();
    await sleep(1200);
    const modalText = await page.evaluate(() => document.body.innerText);
    results.createModalOpened = /ordonnance|médicament|laboratoire/i.test(modalText) ? "PASS" : "WARN";
    results.createModalDefaultNotErOnly =
      /pharmacie|délivrance|distrib/i.test(modalText) || !/ER_ADMINISTER_ONLY/.test(modalText)
        ? "PASS (modal is not ER_ADMINISTER_ONLY chrome)"
        : "FAIL";
    await shot(page, "rn-create-modal");
    const closeCandidates = await page.$$("button");
    for (const btn of closeCandidates) {
      const label = await page.evaluate((el) => el.textContent?.trim(), btn);
      if (label === "Fermer" || label === "Annuler" || label === "×") {
        await btn.click();
        break;
      }
    }
  } else {
    results.createModalOpened = "WARN create button not shown on this role/view";
  }

  results.marPostsFromReviewOrders = marPosts.length === 0 ? "PASS none" : `FAIL ${JSON.stringify(marPosts)}`;

  writeFileSync(join(OUT, "results.json"), JSON.stringify({ results, url: page.url(), marPosts }, null, 2));
  console.log(JSON.stringify({ results, url: page.url(), marPosts, screenshots: OUT }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
