const puppeteer = require('puppeteer');

async function pageScreenshot(url, cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  await browser.close();
  cb(screenshot);
}
async function pageHTML(url, cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let html = await page.content();
  await browser.close();
  cb(html);
}
async function pageScreenshotAndHTML(url,cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  let html = await page.content();
  await browser.close();
  cb(screenshot,html);
}
module.exports = {
  pageScreenshot: pageScreenshot,
  pageHTML: pageHTML,
  pageScreenshotAndHTML: pageScreenshotAndHTML
}
