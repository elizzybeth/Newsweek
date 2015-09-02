var MongoClient = require('mongodb').MongoClient;
var Crawler = require("crawler").Crawler;
var cheerio = require('cheerio');
   
// Load database
var fixData = function(articles) {
    // Query the database and get the article data in a variable
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed3:{$exists: false}}, function(err, article) {          
            if(article === null){
                console.log("All done!");
                return;
            }
          
            article.trimmed3 = true;
            
            // Fix broken publish date
            var $ = cheerio.load(article.HTML);
            
            // Update publish date 
            if(article.pubDate.getTime() === 0) {
                console.log("Found an article with a bad date: " + article.pubDate);
                article.pubDate = new Date($(".timedate").attr('content'));
                console.log("New pubDate: " + article.pubDate);
            }
        });
    };
    articles.update({trimmed3: true}, {$unset: {trimmed3:''}}, {multi: true}, function(err) {
        if(err){
            console.log("Couldn't untrim.");
            console.dir(err);
            process.kill();   
        }
        fixArticle(articles); 
    });
};



MongoClient.connect("mongodb://localhost:27017/newsweek", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('articles4', function(err, articles) {
        if(err) {
            console.log("Couldn't create articles collection.");
            console.dir(err);
            process.kill();
        }
        fixData(articles);
           
    });
});

    