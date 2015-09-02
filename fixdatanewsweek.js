var MongoClient = require('mongodb').MongoClient;
var Crawler = require("crawler").Crawler;
var cheerio = require('cheerio');
   
// Load database
var fixData = function(articles) {
    // Query the database and get the article data in a variable
    var fixArticle = function(articles) {
        // Find all articles that haven't been marked as trimmed
        articles.findOne({trimmed:{$exists: false}}, function(err, article) {
            var rx = /^http:\/\/www.newsweek.com\/newsfeed/;
            
            console.log("Working on this article: " + article.URL);
                        
            if(article === null){
                console.log("All done!");
                return;
            }
            
           
            article.trimmed = true;
            
            var shouldRemove = false;
            if(article.wordCount < 20 || article.paragraphs === "") {    // 20 b/c NW seems to have more short "real" articles, lots in the ~100-word range
                shouldRemove = true;
                console.log("Tiny or empty article detected: " + article.URL);
            }
            
            if(shouldRemove) {
                articles.remove({_id: article._id}, function(err){
                    if(err){
                        console.log("Couldn't remove.");
                        console.dir(err);
                        process.kill();
                    }
                });
            } 
            
            // Fix broken publish date
            var $ = cheerio.load(article.HTML);
            
            // Update publish date 
            if(article.pubDate.getTime() === 0) {
                article.pubDate = new Date($(".timedate").attr('content'));
            }
    
            // Trim links
            var i;
            var newLinks = [];
            article.totalLinkWords = 0;
            article.totalLinkCharacters = 0;
            article.totalLinksToNewsweek = 0;
            article.totalLinksToInternationalBusinessTimes = 0;
            article.totalLinksToMedicalDaily = 0;
            article.totalLinksToLatinTimes = 0;
            article.totalLinksToiDigitalTimes = 0;
            article.totalLinksToIBTimesGroup = 0;
            
            for(i = 0; i < article.links.length; i++) {
                var link = article.links[i];
                var trimmedLink = link.text.trim();
                if (trimmedLink != link.text) {
                    console.log("Trimming link from '" + link.text + "' to '" + trimmedLink + "'"); 
                    link.text = trimmedLink;
                }
                link.length = link.text.length;
                link.wordCount = link.text.split(" ").length;
                
                // Check if the link contains Newsweek, International Business Times, Medical Daily, Latin Times, iDigital Times                
                if (link.href.indexOf("www.newsweek.com") !== -1) {
                    if(!link.linksToNewsweek){
                        console.log("Found a link to another Newsweek article: " + article.URL + " > " + link.href);
                    }
                    link.linksToNewsweek = 1;
                } else {
                    link.linksToNewsweek = 0;
                }
                
                //IBT Media                
                if(link.href.indexOf("ibtimes.com") !== -1) {
                    if(!link.linksToInternationalBusinessTimes){
                        console.log("Found a link to an International Business Times article: " + article.URL + " > " + link.href);
                    }
                    link.linksToInternationalBusinessTimes = 1;
                } else {
                    link.linksToInternationalBusinessTimes = 0;
                }
                
                if(link.href.indexOf("www.medicaldaily.com") !== -1) {
                    if(!link.linksToMedicalDaily){
                        console.log("Found a link to a Medical Daily article: " + article.URL + " > " + link.href);
                    }
                    link.linksToMedicalDaily = 1;
                } else {
                    link.linksToMedicalDaily = 0;
                }
                
                if(link.href.indexOf("www.latintimes.com") !== -1) {
                    if(!link.linksToLatinTimes){
                        console.log("Found a link to a Latin Times article: " + article.URL + " > " + link.href);
                    }
                    link.linksToLatinTimes = 1;
                } else {
                    link.linksToLatinTimes = 0;
                }
                
                if(link.href.indexOf("www.idigitaltimes.com") !== -1) {
                    if(!link.linksToiDigitalTimes){
                        console.log("Found a link to a iDigitalTimes article: " + article.URL + " > " + link.href);
                    }
                    link.linksToiDigitalTimes = 1;
                } else {
                    link.linksToiDigitalTimes = 0;
                }
                
                
                
                // This "bad link" stuff is from the Slate crawler; not sure if it'll catch anything in NW or not
                var badLink = false; 
                if (link.href) {
                    console.log(link.href);

                    var domainParts = link.href.
                     match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
                     
                    if (domainParts && domainParts.length >= 2) {
                        domainParts = domainParts[1].split('.');
                        if (domainParts.length >= 2) {
                            link.domain = domainParts[domainParts.length - 2] +
                             "." + domainParts[domainParts.length - 1];
                            if (link.domain == 'co.uk' || link.domain == 'co.jp' || link.domain == 'co.ke' || link.domain == 'co.at') {
                                link.domain = domainParts[domainParts.length - 3] +
                                 "." + link.domain;
                            }
                            console.log(link.domain);
                        } else {
                            badLink = true;
                        }
                    } else {
                        badLink = true;
                    }
                } else {
                    badLink = true;
                }
                
                // Remove all links where the text is empty (to deal with images)
                if (link.length == 0) {
                    console.log("Empty link DETECTED! " + article.URL);
                } else if (badLink) {
                    console.log("Bad href DETECTED! " + article.URL);
                } else if (link.href.indexOf(article.URL) == 0) {
                    // Remove all links that are to the same page (diff sections) - with regex
                    console.log("Internal link DETECTED! " + link.href);
                } else if (link.href.indexOf("mailto") == 0) { 
                    // Remove mailto links
                    console.log("Mailto link DETECTED! " + link.href);
                } else {
                    // Increment link counts    
                    newLinks[newLinks.length] = link;
                    article.totalLinkWords += link.wordCount;
                    article.totalLinkCharacters += link.length;
                    article.totalLinksToNewsweek += link.linksToNewsweek;
                    article.totalLinksToInternationalBusinessTimes += link.linksToInternationalBusinessTimes;
                    article.totalLinksToMedicalDaily += link.linksToMedicalDaily;
                    article.totalLinksToLatinTimes += link.linksToLatinTimes;
                    article.totalLinksToiDigitalTimes += link.linksToiDigitalTimes;
                }
            }
            
            article.totalLinksToIBTimesGroup = article.totalLinksToInternationalBusinessTimes + article.totalLinksToMedicalDaily + article.totalLinksToLatinTimes + article.totalLinksToiDigitalTimes;
            
            if(article.links.length != newLinks.length){
                console.log("Removed " + (article.links.length - newLinks.length) + " links.");
            }
            article.links = newLinks;
            
            // Trim paragraphs
            var newParagraphs = [];
            for(i = 0; i < article.paragraphs.length; i++) {
                var paragraph = article.paragraphs[i];
                var trimmedParagraph = paragraph.trim();
                if (trimmedParagraph != paragraph) {
                    console.log("Trimming paragraph " + i);
                    paragraph = trimmedParagraph;
                }
                article.paragraphs[i] = paragraph;     
            }
            
            // Get some averages 
            article.wordCount = article.fullText.split(" ").length;
            article.linkCount = article.links.length;
            
            if(article.links.length === 0){
                article.averageAnchorTextWordCount = 0;
                article.averageAnchorTextCharacterCount = 0;
            } else {
                article.averageAnchorTextWordCount = article.totalLinkWords / article.links.length;
                article.averageAnchorTextCharacterCount = article.totalLinkCharacters / article.links.length;
            }
            
            if(article.paragraphs.length === 0){ // shouldn't be zero at this point, but just in case
                article.linksPerParagraph = 0;
            } else {
                article.linksPerParargraph = article.links.length / article.paragraphs.length;
            }
            
            if(article.wordCount === 0){
                article.linksPerWord = article.totalLinkWords / article.wordCount;            
            }
            
            article.test = "potato";
            delete article.test;
            
           // Update articles              
            articles.update({_id: article._id}, article, {w: 1}, function(err, result) {
                if(err){
                    console.log("Couldn't trim: ", article.URL);
                    console.dir(err);
                    process.kill();
                }
                fixArticle(articles);
/*
                articles.remove({URL: article.URL, _id: {$ne: article._id}}, function(err, articlesDeleted){
                    if(articlesDeleted){
                        console.log("Removing duplicate article: " + article.URL);
                    }
                    if(err){
                        console.log("Couldn't remove duplicate article: " + article.URL);
                        console.dir(err);
                        process.kill();
                    }
                    fixArticle(articles);
                });
*/ //had problems, was deleting articles that weren't duplicates... mongodb query suggests there aren't any (shouldn't be), so just killing this piece of code
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
        console.log("Found " + articles.length + " articles, fixing now.");
        fixArticle(articles); 
    });
    console.log("updated");
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

/* function printResult (r) {print(tojson(r))} db.newsweek.find().forEach(printResult) */

