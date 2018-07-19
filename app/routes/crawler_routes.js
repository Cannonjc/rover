const crawler = require('./../puppeteer/crawler.js');

module.exports = function(app) {
  app.get('/crawl/screenshot/:url', (req, res) => {
    const url = req.params.url;
    crawler.pageScreenshot(url, function(screenshot) {
      res.contentType('image/png');
      res.send(screenshot);
    });
  });
  app.get('/crawl/html/:url', (req, res) => {
    const url = req.params.url;
    crawler.pageHTML(url, function(html) {
      res.contentType('text/html');
      res.send(html);
    });
  });
  app.get('/crawl/screenshot_and_html/:url', (req, res) => {
    const url = req.params.url;
    crawler.pageScreenshotAndHTML(url, function(screenshot,html) {
      let buffedScreen = Buffer.from(screenshot).toString('base64');
      let buffedHtml = Buffer.from(html).toString('base64');
      let obj = JSON.stringify({'screenshot': buffedScreen, 'html': buffedHtml});
      res.contentType('application/json');
      res.send(obj);
    });
  });
  app.post('/crawl/crawl_site', (req,res) => {
    console.log(req.body);
    crawler.mainCrawl(req.body);
  });
};
