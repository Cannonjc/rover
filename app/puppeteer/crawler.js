const puppeteer = require('puppeteer');
const xPathToCss = require('xpath-to-css');
const fs = require('fs');
const mkdirp = require('mkdirp');
let storage = {};
let recordCount = 1;

async function pageScreenshot(url, cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  await browser.close();
  cb(screenshot);
};
async function pageHTML(url, cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let html = await page.content();
  await browser.close();
  cb(html);
};
async function pageScreenshotAndHTML(url,cb) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let screenshot = await page.screenshot({fullPage: true});
  let html = await page.content();
  await browser.close();
  cb(screenshot,html);
};

async function mainCrawl(params) {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  for (var key in params) {
    await decider(page, key, params);
  }
  // await page.waitFor(4000);
  await browser.close();
};

async function decider(page, key, params) {
  console.log(key);
  // console.log(params[key]);
  switch(key) {
    case 'start_url':
      await startUrl(page, params[key]);
      break;
    case 'form':
      await fillForm(page, params[key]);
      break;
    case 'screenshot':
      storage[params[key]] = await page.screenshot({fullPage:true});
      break;
    case 'html':
      storage[params[key]] = await page.content();
      break;
    case 'record_links':
      await traverseLinks(page, params[key]);
      break;
    case 'save_and_erase':
      await save_and_erase();
      break;
    case 'click':
      await page.click(xPathToCss(params[key]));
      break;
    // case 'record_detail_links':
      // await traverseLinks();
      // break;
    default:
      break;
  }
};

async function startUrl(page, url) {
  await page.goto(url);
};

async function traverseLinks(page, linksInfo) {
  console.log('linksInfo');
  console.log(linksInfo);
  // console.log(JSON.parse(linksInfo)['links_selector']);
  // let json = JSON.parse(linksInfo)
  let links = await getLinksFromXPathSelector(page, linksInfo['links_selector']);
  // console.log(links);
  for (i = 0; i < links.length; i++) {
  // for (var link in links) {
    await goToRecordPage(page, links[i], linksInfo['record']);
    // functionality of what to do with each record to change
  }
};
async function goToRecordPage(page,link, linkInfo) {
  console.log('going to link: ', link);
  await Promise.all([
    page.waitForNavigation(),
    page.goto(link)
  ]);
  for (var key in linkInfo) {
    await decider(page, key, linkInfo);
  }
  await Promise.all([
		page.waitForNavigation(),
		page.goBack()
	]);
};

async function fillForm(page,keyValues) {
  console.log('filling form');
  console.log(keyValues);
  for (var key in keyValues) {
    console.log(key);
    console.log(keyValues[key]);
    switch(key) {
      case 'text_field':
        await textFieldFill(page, keyValues[key]);
        break;
      case 'select':
        await selectFill(page, keyValues[key]);
        break;
      case 'submit':
        await page.click(xPathToCss(keyValues[key]));
        break;
      default:
        break;
    }
  }
};
async function textFieldFill(page, selectorsValues) {
  console.log('Filling text fields');
  for (var selector in selectorsValues) {
    console.log(selector);
    console.log(xPathToCss(selector));
    console.log(selectorsValues[selector]);
    await page.click(xPathToCss(selector));
    console.log('test');
    await page.keyboard.type(selectorsValues[selector]);
  }
};
async function selectFill(page, selectorsValues) {
  // console.log('selectors fields');
  for (var selector in selectorsValues) {
    await page.select(xPathToCss(selector), selectorsValues[selector]);
  }
};


async function save_and_erase() {
  let path = await 'screenshots/item'+recordCount;
  await makeDirectory(path);
  await makeDirectory(path+'/base');
  await makeDirectory(path+'/record');
  await saveFile(path+'/base/base.html',storage['index_html']);
  await saveFile(path+'/base/base.png',storage['index_screenshot']);
  await saveFile(path+'/record/record.html',storage['record_html']);
  await saveFile(path+'/record/record.png',storage['record_screenshot']);
  delete storage['record_html'];
  delete storage['record_screenshot'];
  await recordCount++;
};
// async function makeDirectory(path) {
// 	mkdirp(path, function(err) {
// 		if (err) throw err;
// 	});
// };
// async function saveFile(path, content) {
// 	await fs.writeFile(path, content, (err) => {
// 		if (err) throw err;
// 	});
// };
function makeDirectory(path) {
    return new Promise((resolve, reject) => {
        mkdirp(path, function(err) {
            if (err) return reject(err);
            return resolve();
        });
    })
};
function saveFile(path, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, content, (err) => {
            if (err) return reject(err);
            return resolve();
        });
    })
};

async function getLinksFromXPathSelector(page,selector) {
  console.log('links selector');
  console.log(selector);
  const links = await page.evaluate((mySelector) => {
		let results = [];
  	let query = document.evaluate(mySelector,
      document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	  for (let i=0, length=query.snapshotLength; i<length; ++i) {
	    results.push(query.snapshotItem(i).href);
	  }
		return results;
	}, selector);
  return links;
};

module.exports = {
  pageScreenshot: pageScreenshot,
  pageHTML: pageHTML,
  pageScreenshotAndHTML: pageScreenshotAndHTML,
  mainCrawl: mainCrawl
}
