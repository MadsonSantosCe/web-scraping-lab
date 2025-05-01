import puppeteer from "puppeteer";
import fs from "fs";
import axios from "axios";
import path from "path";

const __dirname = path.resolve();

async function scrapeImages() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.pokemon-zone.com/cards/?series=PROMO-A");

  let previousHeight;
  while (true) {
    const imgList = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return new Promise((resolve) => {
        setTimeout(() => {
          const nodeList = document.querySelectorAll(".card-grid img");
          const imgArray = [...nodeList];
          const imgList = imgArray.map(({ src }) => src);
          resolve(imgList);
        }, 2000);
      });
    });

    const currentHeight = await page.evaluate("document.body.scrollHeight");
    if (previousHeight === currentHeight) {
      break;
    }
    previousHeight = currentHeight;
  }

  const imgList = await page.evaluate(() => {
    const nodeList = document.querySelectorAll(".card-grid img");
    const imgArray = [...nodeList];
    const imgList = imgArray.map(({ src }) => src);

    return imgList;
  });

  fs.writeFile("pokemon_card.json", JSON.stringify(imgList, null, 2), (err) => {
    if (err) throw new Error("something went wrong");

    console.log("well done");
  });

  await browser.close();
}

async function downloadImages() {
  if (!fs.existsSync("images")) {
    fs.mkdirSync("images");
  }

  const rawData = fs.readFileSync("pokemon_card.json");
  const urls = JSON.parse(rawData);

  for (const url of urls) {
    const fileName = path.basename(url.split("?")[0]);
    const filePath = path.resolve(__dirname, "images", fileName);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    response.data.pipe(fs.createWriteStream(filePath));
    console.log(`Downloaded: ${fileName}`);
  }
}

(async () => {
  //Running both functions can take a while, as this is a test I recommend running one at a time
  //await scrapeImages();

  //await downloadImages();
})();
