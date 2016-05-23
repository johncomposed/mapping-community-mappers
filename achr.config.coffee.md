
## Configuration file of my Mapping Community Mappers research project
_Written in Literate Coffeescript_

Aka this file is literally the one I'm using in my project.

First, let's start the wrapper function and setup some utilities. 

    module.exports = ((utils, dir) ->
      join = require('path').join
      u = utils
      _ = u.libs.lodash
      graphdb = u.graphdb(join(__dirname, 'db'))
      frozone = "#{join(__dirname, 'freezer', 'achr.net')}.json"
      
Worth noting: `dir` is the path to where hyperlinker lives, while `__dirname` is where this file lives. You usually won't need `dir`, but I figured I'd make sure it was available.

Also note how the first block was 4 spaces, but everything after that is indented to 6. So now I need to be sure that all my code blocks are 6 spaces, so they continue to be inside the wrapper function.

### The Crawler
Alrighty! Let's get the crawler configured!

      crawl =
        domain: 'achr.net'

For testing right now I'm not freezing anything.
But things are still getting saved to the database during testing! So I'll have to delete it before my first run. I'll probably put a config file to deal with reseting the db in v1.

        defrost: false
        freeze: false

These are configuration options for [Node Simplecrawler](https://github.com/cgiffard/node-simplecrawler#configuration), plus a few I've that are useful for mapping. Documentation for those is, once again, planned for v1.

        crawler:
          maxDepth: 4
          onlyHypertext: true
          onlyVisible: true
          followExternal: true

And since I'm crawling across the web, I want to make sure I'm not gonna crawl like social media or anything like that. Luckily, the utilities object includes a list (array) of the Alexa 500, the top 500 sites on the web. So I'm going to add them into this domain blacklist option.

          domainBlacklist: u.alexa500

This is just a simple little wrapper over [Node Crawler's Events](https://github.com/cgiffard/node-simplecrawler#events).

        on:
          'fetchcomplete': ((queueItem, data, res) ->
            waiting = @wait()
            $ = u.libs.cheerio.load(data)
            
            external = u.links($(u.select.e(queueItem.host)), $)
            internal = u.links($(u.select.i(queueItem.host)), $)

So here's where a lot of the magic happens. I'm adding all internal and external links to the graph database as nodes with their corresponding predicate (relationship).

            graphdb.put _.map(external, (value, key) ->
                subject: queueItem.url
                predicate: 'external'
                object: value
            )
            graphdb.put _.map(internal, (value, key) ->
                subject: queueItem.url
                predicate: 'internal'
                object: value or '#'
            )
            
            console.log 'Crawled %s', queueItem.url
            waiting()
          )
          
That's it! 30 lines for a pretty complicated crawler. 

### Visulizing my data. 

Some initial configuration

      viz =
        port: 3003
        publicDir: join(__dirname, 'public')

Now here's the backend api. When you hit the /api/[key] of any of these, it calls them and returns the data provided by the callback.

        api: data: (callback) ->
          graphdb.get {}, (err, list) ->
            edges = _.map(list, (n) ->
                classes: n.predicate
                group: 'edges'
                data:
                  source: n.subject
                  target: n.object
                  id: n.object + '_from_' + n.subject
            )
            nodes = []
            _.forEach list, (n) ->
              nodes.push
                group: 'nodes'
                data: id: n.object
              nodes.push
                group: 'nodes'
                data: id: n.subject
              return
            data = _.concat(_.uniq(nodes), edges)
            callback err, data

And here are the scripts that get injected into the page scope! 

        scripts: [
          (->
            console.log "hello page!"
          )
        ]


And finally, I'm returning the configuration. 

      return {
        crawl: crawl,
        viz: viz
      }
    )

Horray for literate coffeescript! 

_- John Williams_
