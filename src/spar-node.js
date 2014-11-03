var express = require('express');
var config = require('./config.js').config;
var sparclient = require('./sparclient.js');

var app = express();

app.param('ssn', function(req, res, next, id){
  res.set('Content-Type', 'application/json');

  var errorHandler = function(error, response, body){
    res.status(503).end();
    console.error("Error calling " + config.sparUrl);
    console.error(error);
    if(response){
        console.error("Status code: " + response.statusCode);
    }
    console.error("payload: " + body);
    next();
  }

  var normalHandler = function(person){

    if(person === undefined){
        res.status(404).end();
        console.log('Did not find person with id:' + id);
        next();
    }else if(person.secret === true){
        res.status(404).end();
        console.log('Person with id has secret identity:' + id);
        next();
    }else if(person.deregistrationcode === 'G' && person.newSsn){
        console.log('Person has a new ssn:' + id);
        res.redirect(301, '/person/' + person.newSsn);
    }else if(person.deregistrationcode){
        console.log('Person is no longer registered at SPAR:' + id);
        res.status(404).end();
        next();
    } else{
        console.log('Found person with id:' + id);
        res.send(JSON.stringify(person));
        next();
    }
  }

  sparclient.getPerson(id, function(err, person){
    if(err){
        errorHandler(err.error, err.response, err.body);
    }else{
        normalHandler(person);
    }
  });
});

app.get('/person/:ssn', function (req, res, next) {
  //See app.param('ssn')
  next();
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('SPAR app listening at http://%s:%s', host, port);
});