const Crawl = require('../models/crawl')
const CronJob = require('cron').CronJob

class Rover {
  static run() {
    return new CronJob({
      cronTime: '00 00 /30 * * 1-5',
      onTick: Crawl.startCrawler.bind(Crawl),
      start: false
    })
  }
}

module.exports = Rover
