var config = require('./config.js').config;
var request = require('request');
var mustache = require('mustache');
var fs = require('fs');
require('coffee-script/register');
var personTransformer = require('./personTransformer');

var getPerson = function(ssn, callback){
    var model = {
        config: config,
        ssn: ssn,
        date: new Date().toISOString()
    }

    template(model, callback);
};

function template(model, callback) {
    fs.readFile('src/request.xml', function (err, data) {
        if (err) {
           callback({error: "problem using template: " + JSON.stringify(err)});
        }else{
            var output = mustache.render(data.toString(), model);

            callSpar(output, callback);
        }
    });
}

function callSpar(requestXml, callback){
    request.post({
        url: config.sparUrl,
        body: requestXml
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
            personTransformer.transform(body, callback);
        }else {
            callback({error:error, response:response, body:body});
        }
    });
}

module.exports.getPerson = getPerson;