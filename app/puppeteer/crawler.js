const puppeteer = require('puppeteer');
const xPathToCss = require('xpath-to-css');
const axios = require('axios');

class Crawler {
  constructor(crawl) {
    this.commandList = crawl.commandList;
    this.state = {
      startUrl : crawl.startUrl,
      respondUrl : crawl.respondUrl,
      errorUrl : crawl.errorUrl,
      crawlID : crawl.crawlID,
      dimensionID : crawl.dimensionID,
      nextPage : crawl.nextPage || '',
      backButton : crawl.backButton || '',
      linksSelector: crawl.linksSelector,
      pageNum : 0,
      formsList : crawl.formsList,
      formsCount : 0,
      clicksList : crawl.clicksList,
      clicksCount : 0,
      error: '',
      errorSent: false
    }
  }

  async startCrawl() {
    console.log("Started crawl");
    // console.log(this.state);
    this.browser = await puppeteer.launch({headless: false});
    this.state.page = await this.browser.newPage();
    // console.log(this.state);
    await this.runCommands(this.state);
    await this.browser.close();
    return this.state;
  }

  async runCommands(state) {
    return this.commandList.reduce( (chain, currentFunc) => {
      return chain.then((state) => {
        if (state.error) {
          if (!state.errorSent) {
            this.sendError(state);
            this.error = state.error;
            return {...state, errorSent: true}
          } else {
            return {...state}
          }
        } else {
          return this.decider(currentFunc, state);
        }
      });
    }, Promise.resolve(this.state));
  }

  async decider(currentFunc, currentState) {
    switch(currentFunc) {
      case 'start_url':
        return await this.startUrl(currentState);
        break;
      case 'form':
        return await this.fillForm(currentState);
        break;
      case 'records_screenshot':
        return {...currentState, records_screenshot: await currentState.page.screenshot({fullpage:true})};
        break;
      case 'records_html':
        return {...currentState, records_html: await currentState.page.content()};
        break;
      case 'record_links':
        return await this.resultsPage(currentState);
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
    // console.log(await this.convertXPath(selector))
    try {
      await newPage.click(await this.convertXPath(selector))
      return {...state, page: newPage, clicksCount: state.clicksCount+1};
    } catch(e) {
      console.log("Error clicking")
      return {...state, error: e}
    }
  }

  async textFieldFill(page, selectorsValues) {
    console.log('Filling text fields')
    for (var selector in selectorsValues) {
      try {
        // console.log(selector);
        // console.log(await this.convertXPath(selector));
        await page.click(await this.convertXPath(selector));
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
        await page.select(await this.convertXPath(selector), selectorsValues[selector]);
      } catch(e) {
        console.log("Error in select on form");
        break;
      }
    }
  }

  async fillForm(state) {
    console.log('filling form');
    // console.log(keyValues);
    const keyValues = state.formsList[state.formsCount]
    const newPage = state.page
    for (var key in keyValues) {
      if (state.error) {
        sendError(state.error);
        break;
      } else {
        switch(key) {
          case 'text_field':
            await this.textFieldFill(newPage, keyValues[key]);
            break;
          case 'select':
            await this.selectFill(newPage, keyValues[key]);
            break;
          default:
            break;
        }
      }
    }
    return {...state, page: newPage, formsCount: state.formsCount+1}
  }

  async resultsPage(state) {
    console.log('linksInfo');
    const newPage = await state.page;
    const resultsScreenshot = await newPage.screenshot({fullPage: true});
    const resultsHtml = await newPage.content();
    let links = []
    try {
      links = await this.getLinksFromXPathSelector(state);
    } catch (e) {
      console.log("error getting links");
      return {...state, error: e};
    }
    for (let i = 0; i < links.length; i++) {
      const detailsArr = await this.goToDetailsPage(state, links[i]);
      this.sendRecord(i,state,resultsScreenshot,resultsHtml,detailsArr[0],detailsArr[1]);
    }
    console.log("next page? ", state.nextPage);
    if (state.nextPage) {
      console.log("YES")
      const pageNum = state.pageNum
      const newState = await this.nextPageExists(state);
      if (!newState.error && pageNum != newState.pageNum) {
        console.log("No error - next page")
        return await this.resultsPage(newState);
      }
    }
    return {...state, page: newPage};
  }
  async goToDetailsPage(state,link) {
    const page = state.page
    console.log('going to link: ', link);
    await Promise.all([
      page.waitForNavigation(),
      page.goto(link)
    ]);
    const detailsScreenshot = await page.screenshot({fullPage:true});
    const detailsHtml = await page.content();
    console.log("going back");
    await this.goBack(state);
    return [detailsScreenshot, detailsHtml];
  };
  async nextPageExists(state) {
    let converted = ''
    try {
      converted = await this.convertXPath(state.nextPage)
    } catch (e) {
      return {...state, error: e}
    }
    try {
      await Promise.all([
        state.page.waitForNavigation(),
        state.page.click(converted)
      ]);
      console.log("next page")
      return {...state, pageNum: state.pageNum+1}
    } catch(e) {
      console.log("No link for next page")
      return {...state}
    }
  }

  async sendRecord(index, state, recordsScreenshot, recordsHtml, detailsScreenshot, detailsHtml) {
    console.log("sending ", index);
    // console.log(initData.respondUrl);
    console.log("page_num: ", state.pageNum);
    let buffedRS = Buffer.from(recordsScreenshot).toString('base64');
    let buffedRH = Buffer.from(recordsHtml).toString('base64');
    let buffedDS = Buffer.from(detailsScreenshot).toString('base64');
    let buffedDH = Buffer.from(detailsHtml).toString('base64');
    axios({
      method: 'post',
      url: state.respondUrl,
      data: {
        crawl_id: state.crawlID,
        dimension_id: state.dimensionID,
        link_num: index,
        page_num: state.pageNum,
        records_screenshot: buffedRS,
        records_html: buffedRH,
        details_screenshot: buffedDS,
        details_html: buffedDH
      }
    }).catch(function (error) {
      // handle error
      // console.log('error sending the record back: ', error);
    });
  };

  async goBack(state) {
    const newPage = state.page
    if (state.backButton) {
      try {
        Promise.all([
          newPage.waitForNavigation(),
          newPage.click(await convertXPath(state.backButton))
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

  async sendError(state) {
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
  	}, state.linksSelector);
    return links;
  }

  async convertXPath(xpath) {
    console.log("converting xpath");
    console.log("xpath: ", xpath);
    try {
      let myConversion = xPathToCss(xpath)
      return myConversion;
    } catch(e) {
      return new Error(xpath);
    }
  }


} // End of Crawler Object

module.exports = Crawler
