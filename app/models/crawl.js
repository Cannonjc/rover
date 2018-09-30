const mongoose  = require('mongoose');
const Async     = require('async');
const Crawler   = require('./../puppeteer/crawler');
const puppeteer = require('puppeteer');


const CrawlSchema = mongoose.Schema({
  respondUrl: {
    type: String,
    required: [true, 'Respond URL is required']
  },
  errorUrl: {
    type: String,
    required: [true, 'Error URL is required']
  },
  crawlID: {
    type: String,
    required: [true, 'Crawl ID is required']
  },
  dimensionID: {
    type: String,
    required: [true, 'Dimension ID is required']
  },
  commandList: {
    type: Array,
    required: [true, 'Command List is required']
  },
  formsList: {
    type: Array
  },
  clicksList: {
    type: Array
  },
  status: {
    type: String,
    default: 'received'
  }
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
});

CrawlSchema.pre('save', function(next) {
  let now = Date.now()
  this.updatedAt = now
  if (!this.createdAt) {
    this.createdAt = now
  }
  next()
})
CrawlSchema.pre('updateMany', function(next) {
  let now = Date.now()
  this.updatedAt = now
  next()
})

CrawlSchema.methods.crawl = function() {
  const crawler = new Crawler(this)
  return crawler.startCrawl()
}

CrawlSchema.statics.startCrawler = function(cb) {
  if (this.countStatus('queued') > 0) {
    return;
  } else {
    this.updateMany({status: 'received'},{ $set: {status: 'queued'}})
    .then(crawls => {
      Async.mapLimit(crawls, 4, (crawl) => crawl.crawl(), (error, results) => {
        return cb(error, results);
      })
    })
  }
}

CrawlSchema.statics.countStatus = function(status) {
  return this.find({status: status}).count().then(count => count)
}












module.exports = mongoose.model('Crawl', CrawlSchema)
