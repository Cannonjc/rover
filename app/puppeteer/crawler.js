const puppeteer = require('puppeteer');
const xPathToCss = require('xpath-to-css');
const fs = require('fs');
const mkdirp = require('mkdirp');
const axios = require('axios');

let recipe = {};
let storage = {};
let recordCount = 1;
let initData = {};

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

async function mainCrawl(params, cb) {
  recipe = params;
  if (checkInitData(params['initialize'])) {
    cb("");
  } else {
    cb("Initialize data is not complete");
    return;
  }
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  for (var key in recipe) {
    if (recipe.error) {
      sendError(recipe.error);
      break;
    } else {
      await decider(page, key, recipe);
    }
  }
  // await page.waitFor(4000);
  await browser.close();
};

async function decider(page, key, params) {
  console.log(key);
  // console.log(params[key]);
  switch(key) {
    case 'initialize':
      await initialize(params[key])
      break;
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
    case 'click':
      await page.click(convertXPath(params[key], setErrorInRecipe));
      break;
    // case 'save_and_erase':
    //   await save_and_erase();
    //   break;
    // case 'send_record':
    //   sendRecord(storage['record_screenshot'],storage['records_html'],storage['details_screenshot'],storage['details_html']);
    //   break;
    // case 'record_detail_links':
      // await traverseLinks();
      // break;
    default:
      break;
  }
};

function checkInitData(initialize) {
  if (initialize['respond_url'] && initialize['error_url'] && initialize['crawl_id']) {
    return true;
  } else {
    return false;
  }
}
async function initialize(params) {
  if (params['respond_url'] && params['error_url'] && params['crawl_id']) {
    initData.respondUrl = params['respond_url'];
    initData.errorUrl = params['error_url'];
    initData.crawlID = params['crawl_id'];
  } else {
    await setErrorInRecipe("Initialize data is not complete");
  }
}

async function startUrl(page, url) {
  await page.goto(url);
};

async function traverseLinks(page, linksInfo) {
  console.log('linksInfo');
  // console.log(linksInfo);
  // console.log(JSON.parse(linksInfo)['links_selector']);
  let links = await getLinksFromXPathSelector(page, linksInfo['links_selector']);
  // console.log(links);
  for (i = 0; i < links.length; i++) {
  // for (var link in links) {
    await goToDetailsPage(page, links[i], linksInfo['record']);
    // functionality of what to do with each record to change
    // We need the index for each link, so we need to just send the record after each time it goes to the details page
    sendRecord(i,storage['records_screenshot'],storage['records_html'],storage['details_screenshot'],storage['details_html']);
  }
};
async function goToDetailsPage(page,link, linkInfo) {
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
  // console.log(keyValues);
  for (var key in keyValues) {
    // console.log(key);
    // console.log(keyValues[key]);
    switch(key) {
      case 'text_field':
        await textFieldFill(page, keyValues[key]);
        break;
      case 'select':
        await selectFill(page, keyValues[key]);
        break;
      case 'submit':
        await page.click(convertXPath(keyValues[key],setErrorInRecipe));
        break;
      default:
        break;
    }
  }
};
async function textFieldFill(page, selectorsValues) {
  console.log('Filling text fields');
  for (var selector in selectorsValues) {
    // console.log(selector);
    console.log(convertXPath(selector,setErrorInRecipe));
    // console.log(selectorsValues[selector]);
    await page.click(convertXPath(selector,setErrorInRecipe));
    // console.log('test');
    await page.keyboard.type(selectorsValues[selector]);
  }
};
async function selectFill(page, selectorsValues) {
  console.log('selectors fields');
  for (var selector in selectorsValues) {
    await page.select(convertXPath(selector,setErrorInRecipe), selectorsValues[selector]);
  }
};

async function save_and_erase() {
  let path = await 'screenshots/item'+recordCount;
  await makeDirectory(path);
  await makeDirectory(path+'/base');
  await makeDirectory(path+'/record');
  await saveFile(path+'/base/base.html',storage['records_html']);
  await saveFile(path+'/base/base.png',storage['records_screenshot']);
  await saveFile(path+'/record/record.html',storage['details_html']);
  await saveFile(path+'/record/record.png',storage['details_screenshot']);
  delete storage['record_html'];
  delete storage['record_screenshot'];
  await recordCount++;
};
async function sendRecord(index,recordsScreenshot, recordsHtml, detailsScreenshot, detailsHtml) {
  console.log("sending");
  console.log(initData.respondUrl);
  let buffedRS = Buffer.from(recordsScreenshot).toString('base64');
  let buffedRH = Buffer.from(recordsHtml).toString('base64');
  let buffedDS = Buffer.from(detailsScreenshot).toString('base64');
  let buffedDH = Buffer.from(detailsHtml).toString('base64');
  // let breeds = await axios.get('http://localhost:3003/api/v1/crawls')
  // console.log(breeds);
  // axios({
  //   method: 'post',
  //   url: initData.respondUrl,
  //   data: {
  //     crawl_id: initData.crawlID
  //   }
  // }).catch(function (error) {
  //   // handle error
  //   console.log(error);
  // });
  axios({
    method: 'post',
    url: initData.respondUrl,
    // url: "/api/v1/crawls/rover_page",
    // proxy: {
    //   host: '127.0.0.1',
    //   port: 3003
    // },
    data: {
      crawl_id: initData.crawlID,
      link_num: index,
      records_screenshot: buffedRS,
      records_html: buffedRH,
      details_screenshot: buffedDS,
      details_html: buffedDH
    }
  }).catch(function (error) {
    // handle error
    console.log(error);
  });
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
function convertXPath(xpath, cb) {
  try {
    let myConversion = xPathToCss(xpath)
    return myConversion;
  } catch(e) {
    cb(e)
  }
}

function setErrorInRecipe(e) {
  recipe.error = JSON.stringify(e);
}

async function sendError(e) {
  axios({
    method: 'post',
    url: initData.errorUrl,
    data: {
      error: e
    }
  }).then((response) => {

  }).catch((erorr) => {
    console.log("We hit an error with sending the error: ",error.message)
  });
}



async function getLinksFromXPathSelector(page,selector) {
  console.log('links selector');
  // console.log(selector);
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
