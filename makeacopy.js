var MongoClient = require('mongodb').MongoClient;

var analyze = function(articles){};

// Split into authors

// Export as .csv



MongoClient.connect("mongodb://localhost:27017/newsweek", function(err, db) {
    if(err) {
        console.log("Couldn't connect.");
        console.dir(err);
        process.kill();
    }
    db.createCollection('newsweekCopy2', function(err, newsweek) {
        if(err) {
            console.log("Couldn't create a copy of Newsweek collection.");
            console.dir(err);
            process.kill();
        }
        // run fix data
        fixData(articles);
           
    });
});