var MongoClient = require('mongodb').MongoClient;
var cheerio = require('cheerio');
   

// Query the database and get the article data in a variable
var fixData = function(articles){
    var fixNames = function(articles) {
        articles.findOne({"authors": null}, function(err, article) {
            console.log("Found an article with an empty author array: " + article.URL);
            if(article === null){
                    console.log("All done!");
                    return;
            }
            
            // Load article HTML
            var $ = cheerio.load(article.HTML);
            console.log("HTML loaded");
            article.authors = [];
            
            // Get text from author span
            $("a.author-name span").each(function(index, span) {
                article.authors.push($(span).text().trim());
            });
            console.log("Filled author array: " + article.authors);
        

            articles.update({_id: article._id}, article, {w: 1}, function(err, result) {
                if(err){
                    console.log("Couldn't trim: ", article.URL);
                    console.dir(err);
                    process.kill();
                }
                fixNames(articles);
            }); 
        });
    };
    fixNames(articles);
    
    articles.update({trimmed2: true}, {$unset: {trimmed2:''}}, {multi: true}, function(err) {
        if(err){
            console.log("Couldn't untrim.");
            console.dir(err);
            process.kill();   
        }
        fixNames(articles); 
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