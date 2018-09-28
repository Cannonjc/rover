const crawler = require('./../puppeteer/crawler.js');
const basicCrawler = require('./../puppeteer/basic.js');
const Crawl = require('./../models/crawl');

module.exports = function(app) {
  app.get('/crawl/screenshot/:url', (req, res) => {
    const url = req.params.url;
    const screenshot = await basicCrawler.pageScreenshot(url);
    res.contentType('image/png');
    res.send(screenshot);
  });
  app.get('/crawl/html/:url', (req, res) => {
    const url = req.params.url;
    const html = await basicCrawler.pageHTML(url);
    res.contentType('text/html');
    res.send(html);
  });
  app.get('/crawl/screenshot_and_html/:url', (req, res) => {
    const url = req.params.url;
    const results = await basicCrawler.pageScreenshotAndHTML(url);
    let buffedScreen = Buffer.from(results[0]).toString('base64');
    let buffedHtml = Buffer.from(results[1]).toString('base64');
    let obj = JSON.stringify({'screenshot': buffedScreen, 'html': buffedHtml});
    res.contentType('application/json');
    res.send(obj);
  });
  app.post('/crawl/crawl_site', (req,res) => {
    // console.log(req.body);
    crawler.mainCrawl(req.body, (responseMessage) => {
      if (responseMessage.length > 1) {
        res.status(400);
        res.contentType('text/html');
        res.send(responseMessage);
      } else {
        res.contentType('text/html');
        res.send('Information received, rover crawl started');
      }
    });
  });

  app.post('/crawl/new_crawl'), (req,res) => {
    let newCrawl = new Crawl({
      respondUrl: req.body.initialize.respond_url,
      errorUrl:
    })
    res.contentType('text/html')
    newCrawl.save().then(crawl => {
      res.send('Crawl has been queued')
    }).catch(err => {
      res.status(400)
      res.send(err)
    })
  }
};
