'use strict';

const _ = require('lodash');
const levelup = require('level');
const levelgraph = require('levelgraph');
const Crawler = require('simplecrawler');
const cheerio = require('cheerio');
const u = require('./utils');

const db = levelgraph(levelup(u.db_path));
const crawler = new Crawler(u.domain);


// Defrost
crawler.queue.defrost(u.freezer);

// Crawler config
crawler.interval = 250;
crawler.maxConcurrency = 40;
crawler.timeout = 8000;
crawler.maxDepth = 5;

crawler.supportedMimeTypes = [/^text\/html/i];
crawler.downloadUnsupported = false;
crawler.fetchIgnoreRegex = /\.(pdf|css|js|gif|jpg|jpeg|png)$/i;

crawler.parseHTMLComments = false;
crawler.parseScriptTags = false;

crawler.allowInitialDomainChange = true;
crawler.filterByDomain = false;
crawler.scanSubdomains = true;

// Blacklist alexa500
crawler.addFetchCondition((parsedURL, queueItem) => (
  !u.alexa500.some((bad) => u.noSub(parsedURL.host) === bad)
));


// Scraper
crawler.on("fetchcomplete", function(queueItem, data, res) {
  var waiting = this.wait();
  var $ = cheerio.load(data);

  var external = $(u.select.e(queueItem.host)).map((i, el) => el.href).get();
  var internal = $(u.select.i(queueItem.host)).map((i, el) => el.href).get();

  db.put(_.map(external, (value, key) => ({
    subject: queueItem.url,
    predicate: "page_link",
    object: value
  })));
  
  db.put(_.map(external, (value, key) => ({
    subject: queueItem.url,
    predicate: "domain_link",
    object: value
  })));

  

  db.put(_.map(internal, (value, key) => ({
    subject: queueItem.url,
    predicate: "internal_link",
    object: value || '#' //TODO: maybe change to object: queueItem.host + value
  })));

  
  
  
  // Done
  console.log("Crawled %s", queueItem.url);
  waiting();
});




// Freeze before kill
process.on("SIGINT", () => crawler.queue.freeze(u.freezer, () => {
  console.log("Frozen queue to %s", u.freezer);
  process.exit();
}));




// Start
crawler.start();
