var Crawler = require("crawler").Crawler;

var MongoClient = require('mongodb').MongoClient;

   
// Set up the crawler
var setupCrawler = function(articles){
    var c = new Crawler({
        "maxConnections":2
    });
    
    var fillErUp = function(err, article) {
        
        if(article === null) {
            console.log("Null article.");
            return;   
        }
        
        console.log("Empty paragraph array on this page: " + article.URL);
                                          
        // queue the article
        c.queue([{
            uri: article.URL, 
            headers: {'Cookie': 'optimizelyEndUserId=oeu1431456463886r0.8055395800620317; __qca=P0-2137854780-1431896759340; _jsuid=2260171571; _cb_ls=1; hz_amChecked=1; nlbi_244165=wxbKYsfzNFNI3Xv8Y28RiAAAAAAsD5n9X9urRsolpUhIciD8; visid_incap_244165=AVezcgKcSKmbgBolBUCUisxKUlUAAAAAQUIPAAAAAABpHpj5HVf74Cax7TeW1wze; incap_ses_104_244165=5GCIL0tbjhoNqTbph3txAUs8WlUAAAAAO5ai1P03Qpe5nRDAAzDRmw==; has_js=1; optimizelySegments=%7B%221256383676%22%3A%22gc%22%2C%221257206885%22%3A%22search%22%2C%221257263738%22%3A%22false%22%7D; optimizelyBuckets=%7B%7D; _ga=GA1.2.1209938015.1431456463; WT_FPC=id=873b398b-f026-4f8d-9a26-52a3135cac7f:lv=1431973586360:ss=1431973019300; pianovisitkey=eyJzIjoiNjliM2NkOTE1YjYwODNkZmZmMjIzMTdhM2YwM2RhNjNkMjgxZTM3NyIsImFiIjpbXX0%253D%257C%257C%257CeAE1j92OAiEMRt%252Bl12TDX%252BnA1b6H8QIQlQTU6Mwmq%252FHd7Tjh7jT98p32BRmC8Y48aqm1gAIBSqvP538q8%252Fn31GNtP%252FnaQcDMq7w85msvdx7%252FIChrlCdCgwIeEF7Q6swFu52y2ilyOGnBGauVIsbL0poACRuoiStrL9u4378FVAhbJrIKEaNK9kCI2mbMJk%252FJYiRWt5G7c%252B7rFHBaD7%252Fw8rDe9dVLbwTcRnYZkAacBxwH9LVEFXKRTbKwr0hfKBEdnZmijSgzKzr%252Fzse%252BP0QUWFk%253D; piano_unique_key=555a1b4d75524c5c3c8b45a7; __atuvc=62%7C20; _chartbeat2=Nh5z58EvtSBOku3b.1416798546558.1431977200359.0000000000000011'}, // FILL THIS RIGHT BEFORE RUNNING)
            
            "callback":function(error,result,$) {
                if(error) {
                    console.log("Error getting page.");
                    console.dir(error);
                    return;    
                }
                
                // Log loaded article
                console.log("Loaded article: " + result.request.uri.href);
            
                // then try to push paragraphs to array again
                var articleData = {
                    HTML: $('html').prop('outerHTML'),
                    URL: result.request.uri.href,
                    author: $("a.author-name").text().trim(),
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
                
                $(".article-body a").not(".trial-promo > a").each(function(index,a) {    
                    var text = $(a).text().trim();
                    if(text !== undefined){
                        articleData.links.push({
                            text: text, 
                            href: a.href,
                            length: text.length,
                            wordCount: text.split(" ").length
                        });
                    }
                });
               
                articles.update({_id: article._id}, articleData, {w: 1}, function(err, article2)  {
                    if(err) {
                        console.log("Couldn't resave article data.");
                        console.dir(err);
                        process.kill();
                    }        
                });
                                            
                // check if paragraph array is empty again, log success/failure
                if (articleData.paragraphs === []) {
                    console.log("Didn't fill paragraphs in this article: " + result.request.uri.href);
                } else {
                    console.log("Paragraphs: ");
                    console.log(articleData.paragraphs);
                    console.log("Successfully filled paragraphs in this article: " + result.request.uri.href);
                }
            }
            
        }]); 
    };    
    articles.find({paragraphs: []}, function(err, articleList){
        console.log(articleList);
        articleList.each(fillErUp);    
        console.log("No more empty paragraph arrays.");
    });
    
};

MongoClient.connect("mongodb://localhost:27017/newsweek", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles4', function(err, collection) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        setupCrawler(collection);
           
    });
});            
