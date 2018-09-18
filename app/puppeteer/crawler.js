const puppeteer = require('puppeteer');
const xPathToCss = require('xpath-to-css');
const fs = require('fs');
const mkdirp = require('mkdirp');
const axios = require('axios');

let recipe = {};
let storage = {};
let pageNum = 0;
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
  if (checkInitData(params['initialize'])) {
    cb("");
  } else {
    cb("Initialize data is not complete");
    return;
  }
  recipe = params;
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
      await page.click(convertXPath(params[key], setErrorInRecipe)).catch(e => console.log('Click error on: ',params[key]));
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
  if (initialize['respond_url'] && initialize['error_url'] && initialize['crawl_id'] && initialize['dimension_id']) {
    recipe = {};
    storage = {};
    pageNum = 0;
    initData = {};
    return true;
  } else {
    return false;
  }
}
async function initialize(params) {
  if (params['respond_url'] && params['error_url'] && params['crawl_id'] && params['dimension_id']) {
    initData.respondUrl = params['respond_url'];
    initData.errorUrl = params['error_url'];
    initData.crawlID = params['crawl_id'];
    initData.dimensionID = params['dimension_id'];
    if (params['next_page']) initData.nextPage = params['next_page'];
    if (params['back_button']) initData.backButton = params['back_button'];
  } else {
    await setErrorInRecipe("Initialize data is not complete");
  }
}

async function startUrl(page, url) {
  console.log("Start url: ",url)
  await Promise.all([
    page.waitForNavigation(),
    page.goto(url)
  ]);
};

async function traverseLinks(page, linksInfo) {
  console.log('linksInfo');
  let links = [];
  try {
    links = await getLinksFromXPathSelector(page, linksInfo['links_selector']);
  } catch (e) {
    setErrorInRecipe(linksInfo['links_selector']);
    return;
  }

  for (i = 0; i < links.length; i++) {
    await goToDetailsPage(page, links[i], linksInfo['record']);
    sendRecord(i,storage['records_screenshot'],storage['records_html'],storage['details_screenshot'],storage['details_html']);
  }
  if (await nextPageExists(page)) {
    console.log("MORE");
    storage['records_html'] = await page.content();
    storage['records_screenshot'] = await page.screenshot({fullPage:true});
    await traverseLinks(page, linksInfo);
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
  await goBack(page);
};
async function nextPageExists(page) {
  console.log("exists?")
  if (initData.nextPage) {
    try {
      await Promise.all([
        page.waitForNavigation(),
        page.click(convertXPath(initData.nextPage,setErrorInRecipe))
      ]);
      console.log("next page")
      pageNum+=1;
      return true;
    } catch(e) {
      console.log("no next page")
      return false;
    }
  }
  return false;
}
async function sendRecord(index,recordsScreenshot, recordsHtml, detailsScreenshot, detailsHtml) {
  console.log("sending ", index);
  // console.log(initData.respondUrl);
  console.log("page_num: ", pageNum);
  let buffedRS = Buffer.from(recordsScreenshot).toString('base64');
  let buffedRH = Buffer.from(recordsHtml).toString('base64');
  let buffedDS = Buffer.from(detailsScreenshot).toString('base64');
  let buffedDH = Buffer.from(detailsHtml).toString('base64');
  axios({
    method: 'post',
    url: initData.respondUrl,
    data: {
      crawl_id: initData.crawlID,
      dimension_id: initData.dimensionID,
      link_num: index,
      page_num: pageNum,
      records_screenshot: buffedRS,
      records_html: buffedRH,
      details_screenshot: buffedDS,
      details_html: buffedDH
    }
  }).catch(function (error) {
    // handle error
    console.log('error sending the record back: ', error);
  });
};

async function fillForm(page,keyValues) {
  console.log('filling form');
  // console.log(keyValues);
  for (var key in keyValues) {
    // console.log(key);
    // console.log(keyValues[key]);
    if (recipe.error) {
      sendError(recipe.error);
      break;
    } else {
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
  }
};
async function textFieldFill(page, selectorsValues) {
  console.log('Filling text fields');
  for (var selector in selectorsValues) {
    // console.log(selector);
    // console.log(convertXPath(selector,setErrorInRecipe));
    try {
      await page.click(convertXPath(selector,setErrorInRecipe));
      await page.keyboard.type(selectorsValues[selector]);
    } catch(e) {
      console.log("Error filling out text fields");
      break;
    }
  }
};
async function selectFill(page, selectorsValues) {
  console.log('selectors fields');
  for (var selector in selectorsValues) {
    try {
      await page.select(convertXPath(selector,setErrorInRecipe), selectorsValues[selector]);
    } catch(e) {
      console.log("Error in select on form");
      break;
    }
  }
};

async function goBack(page) {
  if (initData.backButton) {
    try {
      Promise.all([
        page.waitForNavigation(),
        page.goto(convertXPath(initData.backButton,setErrorInRecipe))
      ]);
    } catch(e) {
      console.log("Error in back button");
    }
  } else {
    await Promise.all([
  		page.waitForNavigation(),
  		page.goBack()
  	]);
  }
}

// async function save_and_erase() {
//   let path = await 'screenshots/item'+recordCount;
//   await makeDirectory(path);
//   await makeDirectory(path+'/base');
//   await makeDirectory(path+'/record');
//   await saveFile(path+'/base/base.html',storage['records_html']);
//   await saveFile(path+'/base/base.png',storage['records_screenshot']);
//   await saveFile(path+'/record/record.html',storage['details_html']);
//   await saveFile(path+'/record/record.png',storage['details_screenshot']);
//   delete storage['record_html'];
//   delete storage['record_screenshot'];
//   await recordCount++;
// };
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
// function makeDirectory(path) {
//     return new Promise((resolve, reject) => {
//         mkdirp(path, function(err) {
//             if (err) return reject(err);
//             return resolve();
//         });
//     })
// };
// function saveFile(path, content) {
//     return new Promise((resolve, reject) => {
//         fs.writeFile(path, content, (err) => {
//             if (err) return reject(err);
//             return resolve();
//         });
//     })
// };
function convertXPath(xpath, cb) {
  try {
    let myConversion = xPathToCss(xpath)
    return myConversion;
  } catch(e) {
    cb(xpath);
  }
}

function setErrorInRecipe(e) {
  console.log(e);
  console.log("setting error in recipe");
  recipe.error = e;
}

async function sendError(e) {
  axios({
    method: 'post',
    url: initData.errorUrl,
    dimension_id: initData.dimensionID,
    page_num: pageNum,
    data: {
      crawl_id: initData.crawlID,
      error: e
    }
  }).then((response) => {

  }).catch((error) => {
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
