const puppeteer = require('puppeteer');
const xPathToCss = require('xpath-to-css');
const axios = require('axios');

class Crawler {
  async constructor(crawl) {
    this.browser = await puppeteer.launch();
    this.commandList = crawl.commandList;
    this.state = {
      page : await this.browser.newPage(),
      startUrl : crawl.startUrl,
      respondUrl : crawl.respondUrl,
      errorUrl : crawl.errorUrl,
      crawlID : crawl.crawlID,
      dimensionID : crawl.dimensionID,
      storage : {},
      nextPage : crawl.nextPage || '',
      backButton : crawl.backButton || '',
      pageNum : 0,
      formsList : crawl.formsList,
      formsCount : 0,
      clicksList : crawl.clicksList,
      clicksCount : 0
    }
  }

  async startCrawl() {
    this.commandList.reduce( (chain, currentFunc) => {
      return chain.then((state) => {
        return Crawler.decider(currentFunc, state);
      });
    }, Promise.resolve(this.state));
    await this.browser.close();
  }

  async decider(currentFunc, currentState) {

    switch(currentFunc) {
      case 'start_url':
        return {...currentState, page: await startUrl(currentState)};
        break;
      case 'form':
        await fillForm(state);
        break;
      case 'records_screenshot':
        return {...currentState, storage["records_screenshot"] = await currentState.page.screenshot({fullPage:true})}
        break;
      case 'records_html':
        return {...currentState, storage["records_html"] = await currentState.page.content()}
        break;
      case 'details_screenshot':
        return {...currentState, storage[params[key]] = await currentState.page.screenshot({fullPage:true})};
        break;
      case 'details_html':
        return {...currentState, storage[params[key]] = await currentState.page.content()};
        break;
      case 'record_links':
        await traverseLinks(currentState);
        break;
      case 'click':
        return await click(currentState);
        break;
      default:
        break;
    }
  }

  async startUrl(state) {
    const newPage = state.page
    await Promise.all([
      newPage.waitForNavigation(),
      newPage.goto(state.startUrl)
    ]);
    return newPage;
  }

  async click(state) {
    const newPage = state.page
    const selector = state.clicksList[state.clicksCount]
    try {
      return {...state, page: await newPage.click(convertXPath(selector, setErrorInRecipe)), clicksCount: state.clicksCount+1};
    } catch(e) {
      return {...state, error: e}
    }
  }

  async fillForm(state) {
    console.log('filling form');
    // console.log(keyValues);
    const keyValues = state.form[state.formsCount]
    for (var key in keyValues) {
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
          default:
            break;
        }
      }
    }
  };




}





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
    return xpath;
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

async function test (state = {}, funcList) {
   args.reduce(async (sum, currentFunc) => {
    const newState = await Crawler[currentFunc](sum)
    return newState
  }, state)
}


// Post - Parameters (rules) - validates it
// Cron - Parses Parameters (figure out what it needs to run)
// Clean state aka puppeteer page, DONT MUTATE

let recps = {}

function addObj(obj) {
  return {...obj, 1: 'asdfasdf'}
}

let newobj = addObj(recps)
