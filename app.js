var Crawler = require("crawler").Crawler; // include Crawler

var MongoClient = require('mongodb').MongoClient; // include Mongo


                     
var setupCrawler = function(collection){
    var c = new Crawler({
        "maxConnections":2,
        
        // Cookie from logged in Newsweek session
        headers: {
            'Cookie': 'optimizelyEndUserId=oeu1431456463886r0.8055395800620317; __qca=P0-2137854780-1431896759340; _jsuid=2260171571; newsletter_signup_popup=1; _cb_ls=1; nlbi_244165=EBFdZzeuoRbHukvhY28RiAAAAABo8QKqrnitunzEJCNS14Pc; visid_incap_244165=AVezcgKcSKmbgBolBUCUisxKUlUAAAAAQUIPAAAAAABpHpj5HVf74Cax7TeW1wze; incap_ses_261_244165=ERVjbDsI/BVstarKf0KfA7j7WVUAAAAAlYbgjzCLEEuvYWQ5THFgWw==; hz_amChecked=1; heatmaps_g2g_100658996=yes; _eventqueue=%7B%22heatmap%22%3A%5B%5D%2C%22events%22%3A%5B%5D%7D; has_js=1; optimizelySegments=%7B%221256383676%22%3A%22gc%22%2C%221257206885%22%3A%22search%22%2C%221257263738%22%3A%22false%22%7D; optimizelyBuckets=%7B%7D; optimizelyPendingLogEvents=%5B%5D; _ga=GA1.2.1209938015.1431456463; _gat=1; __atuvc=45%7C20; __atuvs=5559e94a2e328b9201d; WT_FPC=id=873b398b-f026-4f8d-9a26-52a3135cac7f:lv=1431964277909:ss=1431952185523; _first_pageview=1; _chartbeat2=Nh5z58EvtSBOku3b.1416798546558.1431967889325.0000000000000011; pianovisitkey=eyJzIjoiNWM3NjYzMTU0MGRmYzM2NTAzNDY2ODAxZTlkNzEwYTg3MjJhZDhmYyIsImFiIjpbXX0%253D%257C%257C%257CeAE1j82OAiEQhN%252Blz8TQ%252FMPJ9zAegGWUBHQzzpisxnffHifcvkpXqqrfkCFIb6zXggvBoECA0urr9ZfKcj1eeqztkO8dGCx0yutjufcyk3xCQCXRG2etYvCA8IZWFwo4nVAJg9ZoJxh5lEC0hLe1NQYcdkBHkbWXXZ7PHwYVwu6JVKW1juicoBihcpJ8ckkZjlTdhm8m37eTwWUbfqPjz7brW8%252B9ZPA7vOuANOA6YBrQtxAs1kSlIy9J6cJ9scnayUgXVdQ8U0Wn32ns5x%252F0QFfO; piano_unique_key=555a188276524cb30f8b4601'
        },
                
        // This will be called for each crawled page
        "callback":function(error,result,$) {
            if(error) {
                console.log("Error getting page.");
                console.dir(error);
                return;    
            }
            
            var rx = /^http:\/\/www.newsweek.com\/newsfeed/;
            
            if(rx.test(result.request.uri.href)) {
                // on the index page
                console.log("On the index: " + result.request.uri.href);
                // find each article link on the index page
                $(".article-title a").each(function(index,a) {
                    collection.findOne({URL: a.href + "?piano_d=1"}, function(err, article){
                        if(err){
                            console.log("Article exist check failed.");
                            console.log(err);
                        } else if(article === null){
                            // not in the database already
                            // so let's queue it
                            c.queue(a.href + "?piano_d=1");
                        } else {
                            console.log("Skipping an article that's already in the database: " + a.href);
                        }
                    });                  
                });
                c.queue($(".pager-next a")[0].href);
                return;
            } else {
                console.log("Loaded article: " + result.request.uri.href);            
            }
            
            var articleData = {
                HTML: $('html').prop('outerHTML'),
                URL: result.request.uri.href,
                authors: [],
                title: $("h1.article-title").text().trim(),
                section: $(".icon-title > span").first().text().trim(),
                pubDate: new Date($(".timedate").attr('datetime')),
                retDate: new Date,
                links:[],
                paragraphs:[],
                topics: $(".topics hidden-print").children("a").text().trim() // this is new, Newsweek tags each article like this
            };
            
            // Get all of the paragraphs, excluding paragraphs that offer a trial promo
            $(".article-body p").not(".trial-promo").each(function(index,p) {
                articleData.paragraphs.push($(p).text().trim());
            });
            // Join array elements into a string. 
            articleData.fullText = articleData.paragraphs.join(" ");
            
            // Then turn all new lines into spaces (with replace function). 
            articleData.fullText = articleData.fullText.replace(/[\r\n]/," ");
            
            // Then turn all double spaces into single spaces (replace).
            articleData.fullText = articleData.fullText.replace(/\s\s+/," ");
            
            // Then trim off the final space at end.
            articleData.fullText = articleData.fullText.trim(); 
            
            // Then count words with string.split.
            articleData.wordCount = articleData.fullText.split(" ").length;    
            
            // exclude bad links
            // Text: Full site feed, URL: http://www.newsweek.com/rss
            // Text: [empty] URL: http://www.newsweek.com/subscribe 
            // Text: [empty] URL: https://twitter.com/newsweek

            // exclude trial promo, exclude bad links, then save link data
            $(".article-body a").not(".trial-promo > a").each(function(index,a) {    
                var text = $(a).text().trim();
                if(text !== undefined && text !== "Full site feed" && 
                articleData.URL !== "http://www.newsweek.com/subscribe" && articleData.URL !== "https://twitter.com/newsweek"){
                    articleData.links.push({
                        text: text, 
                        href: a.href,
                        length: text.length,
                        wordCount: text.split(" ").length
                    });
                }
            });
            
            // fill authors array
            $("a.author-name").each(function(index,a){
                articleData.authors.push($(a).text().trim());
            });
           
            if(articleData.text !== ""){
                collection.insert(articleData, {w: 1}, function(err, result) {
                    if(err) {
                        console.log("Couldn't save article data.");
                        console.dir(err);
                        process.kill();
                    }        
                });
            } else {
                console.log("Empty text array on " + articleData.URL + " so not saving it"); // this appears not to be working
            };
        }
    });
    
    c.queue("http://www.newsweek.com/newsfeed");
                    
};

MongoClient.connect("mongodb://localhost:27017/newsweek", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles4', function(err, collection) {
        // articles and articles2 are from before I started saving HTML; articles3 is a 45-page run with an old cookie 
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        setupCrawler(collection);
           
    });
});

// To do: in fix data, look for authorial self-citation

/* var myDocument = db.articles.findOne();

if (myDocument) {var myName = myDocument.name; print (tojson(myName));} */

/* cursor = db.articles.find();
while (cursor.hasNext()) {printjson(cursor.next());}
 */