const crawler = require('./../puppeteer/crawler.js');

module.exports = function(app) {
  app.get('/crawl/screenshot/:url', (req, res) => {
    const url = req.params.url;
    crawler.pageScreenshot(url, function(screenshot) {
      let buffer = new Buffer(screenshot);
      let myScreenshot = buffer.toString('base64');
      // res.contentType('image/png');
      res.send(myScreenshot);
    });
  });
  app.get('/crawl/html/:url', (req, res) => {
    const url = req.params.url;
    crawler.pageHTML(url, function(html) {
      console.log(typeof html);
      let buffer = Buffer.from(html).toString('base64');
      // res.contentType('text/html');
      res.send(buffer);
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
};
