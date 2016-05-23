'use strict';
// dir is script directory, __dirname is this directory
module.exports = function(utils, dir) {
  const path = require('path');
  const u = utils;
  const cheerio = u.libs.cheerio;
  const _ = u.libs.lodash;

  const graphdb = u.graphdb(path.join(__dirname, 'db'));
  const frozone = path.join(__dirname, 'freezer', 'achr.net') + '.json';

  const config = {
    crawl: {
      domain: "achr.net",
      defrost: false,
      freeze: false,
      crawler: {
        interval: 250,
        maxConcurrency: 40,
        timeout: 80000,
        maxDepth: 5,
        // Custom options
        onlyHypertext: true,
        onlyVisible: true,
        followExternal: true,
        domainBlacklist: u.alexa500
      },
      on: {
        "fetchcomplete": function(queueItem, data, res) {
          var waiting = this.wait();
          var $ = cheerio.load(data);

          // Do stuff
          var external = u.links($(u.select.e(queueItem.host)), $);
          var internal = u.links($(u.select.i(queueItem.host)), $);

          graphdb.put(_.map(external, (value, key) => ({
            subject: queueItem.url,
            predicate: "external",
            object: value
          })));

          graphdb.put(_.map(internal, (value, key) => ({
            subject: queueItem.url,
            predicate: "internal",
            object: value || '#' //TODO: maybe change to object: queueItem.host + value
          })));

          // Done
          console.log("Crawled %s", queueItem.url);
          waiting();
        }
        // "fetcherror": updateBroken,
        // "fetchtimeout": updateBroken,
      }
    }
  };

  const viz = {
    port: 3003,
    publicDir: path.join(__dirname, 'public'),
    // customFunctions: [],
    scripts: [
      "./public/cytoscape.min.js",
      function() { 
        /*global document*/
        cytoscape({
          container: document.getElementById('viz'),
          elements: dater,
          style: [{
            selector: 'node',
            style: {
              'background-color': 'red',
              'label': 'data(id)'
            }
          }, {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#ccc',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle'
            }
          }, {
            selector: 'edge.external',
            style: {
              'width': 3,
              'line-color': 'blue',
              'target-arrow-color': '#ccc',
              'target-arrow-shape': 'triangle'
            }
          }],
          layout: {
            name: 'cose',
            idealEdgeLength: 100,
            nodeOverlap: 20
          }
        });
      }
    ],
    api: { 
      // functions here execute in the node scope upon calls to 
      // /api/:key and the 
      data: function(callback) {
        graphdb.get({}, function(err, list) {
          /*
          { 
            data: {
              id: 'e1',
              source: 'n1',
              target: 'n2'
            } 
          }
          */
          var edges = _.map(list, (n) => {
            return {
              classes: n.predicate,
              group: 'edges',
              data: {
                source: n.subject,
                target: n.object,
                id: `${n.object}_from_${n.subject}`
              }
            };
          });
          var nodes = [];
          _.forEach(list, (n) => {
            nodes.push({
              group: 'nodes',
              data: {
                id: n.object
              }
            });
            nodes.push({
              group: 'nodes',
              data: {
                id: n.subject
              }
            });
          });
          var data = _.concat(_.uniq(nodes), edges);

          callback(err, data);
        });
      }
    }
  };

  config.viz = viz;
  return config;
};
