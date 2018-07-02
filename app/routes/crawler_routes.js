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
      res.send(html);
    });
  });
};
