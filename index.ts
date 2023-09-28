import express from "express";
import puppeteer from "puppeteer";
const PORT = 8000;

const app = express();

async function scrapeHorseRacingData(url: string) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(url);
  console.log(`Visited ${url} page`);

  const container = await page.waitForSelector("._t5g4kn", {
    timeout: 60000,
  });

  const sections = (await container?.$$("._1euqwff")) ?? [];

  let correctSection;

  for (const section of sections) {
    const title = await section.$("text/Win & Each Way");
    if (title) {
      correctSection = section;
      break;
    }
  }

  if (!correctSection) {
    throw new Error("Section not found");
  }

  console.log("Found section");

  const namesEls = await correctSection.$$("._1ksksp3");
  const names = await Promise.all(
    namesEls.map((el) => el.evaluate((t) => t.textContent ?? ""))
  );

  const oddsEls = await correctSection.$$("._l437sv");
  const odds = await Promise.all(
    oddsEls.map((el) => el.evaluate((t) => t.textContent ?? ""))
  );

  const result = names.map((name, i) => ({
    horseName: name,
    odds: odds[i],
  }));

  console.log(result);
  return result;
}

app.get("/", async (req, res, next) => {
  if (typeof req.query.eventUrl !== "string") {
    next(new Error("Missing eventUrl param"));
    return;
  }

  if (!req.query.eventUrl.startsWith("https://m.skybet.com/horse-racing/")) {
    next(
      new Error("eventUrl must start with https://m.skybet.com/horse-racing/")
    );
    return;
  }

  try {
    const data = await scrapeHorseRacingData(req.query.eventUrl);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running: http://localhost:${PORT}`);
});
