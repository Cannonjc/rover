const puppeteer = require('puppeteer');

async function pageScreenshot(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  await browser.close();
  return screenshot;
};
async function pageHTML(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let html = await page.content();
  await browser.close();
  return html;
};
async function pageScreenshotAndHTML(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  let html = await page.content();
  await browser.close();
  return [screenshot,html];
};

module.exports = {
  pageScreenshot: pageScreenshot,
  pageHTML: pageHTML,
  pageScreenshotAndHTML: pageScreenshotAndHTML
}
