var MongoClient = require('mongodb').MongoClient; // include Mongo
var plotlykey = require('./plotly_api_key.js').key;
var plotly = require('plotly')("elizzybeth", plotlykey);

var getShareStuff = function(collection){
    var linkCountShareCount;
    var bucketSize = 20;
    collection.find({},{_id: 0, linkCount:1, "FBdata.total_count":1}).toArray(function(err, results){        
        sharesByLinkCount = {};
        
        results.forEach(function(article){
            if(article.FBdata.total_count < 1) {
                return;
            }
            var linkCountBucket = bucketSize*Math.ceil(article.linkCount/bucketSize);
            if (undefined === sharesByLinkCount[linkCountBucket]) {
                sharesByLinkCount[linkCountBucket] = [];
            }
            sharesByLinkCount[linkCountBucket].push(article.FBdata.total_count);
        });
        
        console.log(sharesByLinkCount);
        
        var data = [];
        for(var i in sharesByLinkCount){
            data.push({
                y: sharesByLinkCount[i],
                name: i == 0 ? 0 : (1 + parseInt(i)-bucketSize) + " - " + (i),
                type: "box"
            });    
        }
        var graphOptions = {filename: "box-plot", fileopt: "overwrite", layout: {
                title: "Newsweek: Facebook Share Data by Link Count",
                xaxis: {
                    title: "Link Count"
                },
                yaxis: {
                    title: "Shares, Likes, and Comments",
                    type: 'log'
                }
            }
        };
        plotly.plot(data, graphOptions, function (err, msg) {
            console.log(msg);
        });
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
        getShareStuff(collection);
           
    });
}); 