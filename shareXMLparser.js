var request = require("request");
var MongoClient = require("mongodb").MongoClient;
var parseString = require("xml2js").parseString;

// Get URLs from mongo
// Will need to strip ?piano_d=1 from Newsweek URLs
// request XML page
    //init request
    //
// parse xml
// update


   
// Load database
var fixData = function(articles) {
    // Query the database and get the article data in a variable
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed:{$exists: false}}, function(err, article) {
            if(article === null){
                console.log("All done!");
                return;
            }
            console.log("Working on this article: " + article.URL);
           
            article.trimmed = true;            
            
            var URL = "http://api.facebook.com/restserver.php?method=links.getStats&urls=" + 
                article.URL.replace("?piano_d=1", "");
            
            request(URL, function(error, response, body) {
                if(error || response.statusCode !== 200){
                    console.log(error);
                    process.kill();     
                }
                parseString(body, function (err, result) {
                    if(err){
                        console.log(err);
                        process.kill();
                    }
                    var allFBdata = result.links_getStats_response.link_stat[0];
                    var myFBdata = {
                        share_count: parseInt(allFBdata.share_count[0],10),
                        like_count: parseInt(allFBdata.like_count[0],10),
                        comment_count: parseInt(allFBdata.comment_count[0],10),
                        total_count: parseInt(allFBdata.total_count[0],10),
                        commentsbox_count: parseInt(allFBdata.commentsbox_count[0],10)
                    };
                    console.log(myFBdata);
                    article.FBdata = myFBdata; 
                    
                    // Update articles              
                    articles.update({_id: article._id}, article, {w: 1}, function(err, result) {
                        if(err){
                            console.log("Couldn't trim: ", article.URL);
                            console.dir(err);
                            process.kill();
                        }
                        fixArticle(articles);
                    });
                });
            }); 
        });
    };    
    console.log("About to update.");
    articles.update({trimmed: true}, {$unset: {trimmed:''}}, {multi: true}, function(err) {
        if(err){
            console.log("Couldn't untrim.");
            console.dir(err);
            process.kill();   
        }
        console.log("Found " + articles.length + " articles");
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