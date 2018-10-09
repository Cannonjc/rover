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
  startUrl: {
    type: String,
    required: [true, 'Start Url is required']
  },
  formsList: {
    type: Array
  },
  clicksList: {
    type: Array
  },
  nextPage: {
    type: String,
  },
  backButton: {
    type: String,
  },
  linksSelector: {
    type: String
  },
  status: {
    type: String,
    default: 'received'
  },
  createdAt: {
    type: Date
  },
  updatedAt: {
    type: Date
  }
})

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
  console.log("count for queued: ", this.countStatus('queued').then(count => count))
  if (this.countStatus('queued') > 0) {
    console.log("already queued")
    return;
  } else {
    console.log("before update")
    this.updateMany({status: 'received'},{ $set: {status: 'queued'}}).exec()
    this.find({status: 'queued'}).sort({createdAt: 'asc'})
    .then(crawls => {
      Async.mapLimit(crawls, 4, (crawl) => {
        console.log("here")
        const returnedState = crawl.crawl()
        if (returnedState.error) {
          crawl.status = 'error'
        } else {
          crawl.status = 'completed'
        }
        crawl.save()
      })
    })
  }
}

CrawlSchema.statics.countStatus = function(status) {
  return this.countDocuments({status: status});
}












module.exports = mongoose.model('Crawl', CrawlSchema)
