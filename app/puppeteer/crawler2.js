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
      nextPage : crawl.nextPage || '',
      backButton : crawl.backButton || '',
      links_selector: '',
      pageNum : 0,
      formsList : crawl.formsList,
      formsCount : 0,
      clicksList : crawl.clicksList,
      clicksCount : 0,
      error: ''
    }
  }

  async startCrawl() {
    this.commandList.reduce( (chain, currentFunc) => {
      return chain.then((state) => {
        if (state.error) {
          this.sendError(state);
          break;
        }
        return this.decider(currentFunc, state);
      });
    }, Promise.resolve(this.state));
    await this.browser.close();
  }

  async decider(currentFunc, currentState) {
    switch(currentFunc) {
      case 'start_url':
        return await this.startUrl(currentState);
        break;
      case 'form':
        return await this.fillForm(state);
        break;
      case 'records_screenshot':
        return {...currentState, records_screenshot: await currentState.page.screenshot({fullpage:true})};
        break;
      case 'records_html':
        return {...currentState, records_html: await currentState.page.content()};
        break;
      case 'record_links':
        return await this.traverseLinks(currentState);
        break;
      case 'click':
        return await this.commandClick(currentState);
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
    return {...state, page: newPage};
  }

  async commandClick(state) {
    const newPage = state.page
    const selector = state.clicksList[state.clicksCount]
    try {
      return {...state, page: await newPage.click(convertXPath(selector)), clicksCount: state.clicksCount+1};
    } catch(e) {
      return {...state, error: e}
    }
  }

  async fillForm(state) {
    console.log('filling form');
    // console.log(keyValues);
    const keyValues = state.form[state.formsCount]
    const newPage = state.page
    for (var key in keyValues) {
      if (recipe.error) {
        sendError(recipe.error);
        break;
      } else {
        switch(key) {
          case 'text_field':
            await textFieldFill(newPage, keyValues[key]);
            break;
          case 'select':
            await selectFill(newPage, keyValues[key]);
            break;
          default:
            break;
        }
      }
    }
    return {...state, page: newPage, formsCount: state.formsCount+1}
  }

  async textFieldFill(page, selectorsValues) {
    console.log('Filling text fields')
    for (var selector in selectorsValues) {
      try {
        await page.click(convertXPath(selector));
        await page.keyboard.type(selectorsValues[selector]);
      } catch(e) {
        console.log("Error filling out text fields");
        break;
      }
    }
  }
  async selectFill(page, selectorsValues) {
    console.log('selectors fields')
    for (var selector in selectorsValues) {
      try {
        await page.select(convertXPath(selector), selectorsValues[selector]);
      } catch(e) {
        console.log("Error in select on form");
        break;
      }
    }
  }

  async resultsPage(state) {
    console.log('linksInfo')
    const newPage = state.page
    const resultsArr = [await newPage.screenshots({fullpage:true}), await newPage.content()];
    let links = []
    try {
      links = await this.getLinksFromXPathSelector(state);
    } catch (e) {
      setErrorInRecipe(state.links_selector);
      return;
    }
    for (i = 0; i < links.length; i++) {
      const detailsArr = await this.goToDetailsPage(newPage, links[i], linksInfo['record']);
      this.sendRecord(i,state.pageNum,resultsArr[0],resultsArr[1],detailsArr[0],detailsArr[1]);
    }
    if (state.nextPage) {
      const newState = await this.nextPageExists(state);
      if (!newState.error) {
        return await this.traverseLinks(newState);
      }
    }
    return {...state, page: newPage}
  }
  async goToDetailsPage(page,link, linkInfo) {
    console.log('going to link: ', link);
    await Promise.all([
      page.waitForNavigation(),
      page.goto(link)
    ]);
    for (var key in linkInfo) {
      await this.decider(page, key, linkInfo);
    }
    const details = [await page.screenshot({fullPage:true}), await page.content()]
    await goBack(page);
    return details;
  };
  async nextPageExists(state) {
    try {
      await Promise.all([
        page.waitForNavigation(),
        page.click(convertXPath(state.nextPage))
      ]);
      console.log("next page")
      return {...state, pageNum: state.pageNum+1, records_screenshot: await this.takeScreenshot(currentState.page), records_html: await this.getHtml(currentState.page)}
    } catch(e) {
      return {...state, error: e}
    }
  }

  async sendRecord(index, pageNum, recordsScreenshot, recordsHtml, detailsScreenshot, detailsHtml) {
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

  async goBack(state) {
    const newPage = state.page
    if (state.backButton) {
      try {
        Promise.all([
          newPage.waitForNavigation(),
          newPage.click(convertXPath(state.backButton))
        ]);
      } catch(e) {
        console.log("Error in back button");
        return {...state, error: e};
      }
    } else {
      await Promise.all([
    		newPage.waitForNavigation(),
    		newPage.goBack()
    	]);
    }
    return {...state, page: newPage}
  }

  static sendError(state) {
    axios({
      method: 'post',
      url: state.errorUrl,
      dimension_id: state.dimensionID,
      page_num: state.pageNum,
      data: {
        crawl_id: state.crawlID,
        error: state.error
      }
    }).then((response) => {

    }).catch((error) => {
      console.log("We hit an error with sending the error: ",error.message)
    });
  }

  async getLinksFromXPathSelector(state) {
    const newPage = state.page
    const selector = state.links_selector
    console.log('links selector');
    // console.log(selector);
    const links = await newPage.evaluate((mySelector) => {
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
  }

  static convertXPath(xpath) {
    try {
      let myConversion = xPathToCss(xpath)
      return myConversion;
    } catch(e) {
      return new Error(xpath);
    }
  }



} // End of Crawler Object

module.exports = Crawler
