(function() {
  var agentOptions, app, async, auth, basicAuth, certificate, config, credentials, express, fs, getPerson, https, httpsServer, mustache, privateKey, request, soapRequest, sparclient, stripPrefix, transformResponse, xml2js;

  exports.config = {
    sparUser: 'sparuser',
    sparPassword: 'sparpassword',
    sparUrl: 'http://localhost:8088/sparservice',
    kundNrLeveransMottagare: '500243',
    kundNrSlutkund: '500243',
    orgNrSlutkund: '3102263153',
    slutAnvandarId: 'SymphonyEYCSverige-140508',
    clientCert: './sslcert/spar-client.p12',
    clientCertPassword: '123'
  };

  express = require('express');

  config = require('./config').config;

  sparclient = require('./sparclient');

  basicAuth = require('basic-auth');

  fs = require('fs');

  https = require('https');

  auth = function(req, res, next) {
    var unauthorized, user;
    unauthorized = function(res) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    };
    user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
      return unauthorized(res);
    }
    if (user.name === config.sparUser && user.pass === config.sparPassword) {
      return next();
    } else {
      return unauthorized(res);
    }
  };

  app = express();

  app.use(auth);

  app.param('ssn', function(req, res, next, id) {
    var errorHandler, normalHandler;
    res.set('Content-Type', 'application/json');
    errorHandler = function(error) {
      res.status(503);
      console.error("Error calling " + config.sparUrl);
      console.error(error);
      return next();
    };
    normalHandler = function(person) {
      if (person === void 0) {
        res.status(404);
        console.log('Did not find person with id:' + id);
        return next();
      } else if (person.secret === true) {
        res.status(404);
        console.log('Person with id has secret identity:' + id);
        return next();
      } else if (person.deregistrationcode === 'G' && person.newSsn) {
        console.log('Person has a new ssn:' + id);
        return res.redirect(301, '/person/' + person.newSsn);
      } else if (person.deregistrationcode) {
        console.log('Person is no longer registered at SPAR:' + id);
        res.status(404);
        return next();
      } else {
        console.log('Found person with id:' + id);
        res.send(JSON.stringify(person));
        return next();
      }
    };
    return sparclient.getPerson(id, function(err, person) {
      if (err) {
        return errorHandler(err);
      } else {
        return normalHandler(person);
      }
    });
  });

  app.get('/person/:ssn', function(req, res, next) {
    return next();
  });

  privateKey = fs.readFileSync('sslcert/key.pem', 'utf8');

  certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

  credentials = {
    key: privateKey,
    cert: certificate
  };

  httpsServer = https.createServer(credentials, app);

  httpsServer.listen(443, function() {
    var host, port;
    host = httpsServer.address().address;
    port = httpsServer.address().port;
    return console.log('SPAR app listening at http://%s:%s', host, port);
  });

  config = require('./config').config;

  async = require('async');

  request = require('request');

  mustache = require('mustache');

  xml2js = require('xml2js');

  stripPrefix = require('xml2js').processors.stripPrefix;

  fs = require('fs');

  soapRequest = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://skatteverket.se/spar/instans/1.0" xmlns:ns1="http://skatteverket.se/spar/komponent/1.0">\n   <soapenv:Header/>\n   <soapenv:Body>\n      <ns:SPARPersonsokningFraga>\n         <ns1:IdentifieringsInformation>\n            <ns1:KundNrLeveransMottagare>{{config.kundNrLeveransMottagare}}</ns1:KundNrLeveransMottagare>\n            <ns1:KundNrSlutkund>{{config.kundNrSlutkund}}</ns1:KundNrSlutkund>\n            <ns1:OrgNrSlutkund>{{config.orgNrSlutkund}}</ns1:OrgNrSlutkund>\n            <ns1:SlutAnvandarId>{{config.slutAnvandarId}}</ns1:SlutAnvandarId>\n            <ns1:SlutAnvandarBehorighet>KAT_1</ns1:SlutAnvandarBehorighet>\n            <ns1:SlutAnvandarSekretessRatt>N</ns1:SlutAnvandarSekretessRatt>\n            <ns1:Tidsstampel>{{date}}</ns1:Tidsstampel>\n         </ns1:IdentifieringsInformation>\n         <ns1:PersonsokningFraga>\n            <ns1:PersonId>\n               <ns1:FysiskPersonId>{{ssn}}</ns1:FysiskPersonId>\n            </ns1:PersonId>\n         </ns1:PersonsokningFraga>\n      </ns:SPARPersonsokningFraga>\n   </soapenv:Body>\n</soapenv:Envelope>';

  agentOptions = {
    pfx: fs.readFileSync(config.clientCert),
    passphrase: config.clientCertPassword,
    securityOptions: 'SSL_OP_NO_SSLv3'
  };

  getPerson = function(ssn, cb) {
    var model;
    model = {
      config: config,
      ssn: ssn,
      date: new Date().toISOString()
    };
    return (function() {
      return async.waterfall([
        function(callback) {
          return callback(null, mustache.render(soapRequest, model));
        }, function(requestXml, callback) {
          return request.post({
            url: config.sparUrl,
            agentOptions: agentOptions,
            body: requestXml
          }, function(error, response, body) {
            if (error) {
              console.log(JSON.stringify(error));
              return callback(error.error);
            } else {
              return callback(null, body);
            }
          });
        }, function(response, callback) {
          return transformResponse(response, callback);
        }
      ], function(err, result) {
        return cb(err, result);
      });
    })();
  };

  transformResponse = function(xml, callback) {
    var parser;
    parser = new xml2js.Parser({
      tagNameProcessors: [stripPrefix]
    });
    return parser.parseString(xml, function(err, result) {
      var address, details, fault, faultDetails, person, personDetaljer, sparSvar, _ref, _ref1, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref16, _ref17, _ref18, _ref19, _ref2, _ref20, _ref21, _ref22, _ref23, _ref24, _ref25, _ref26, _ref27, _ref28, _ref29, _ref3, _ref30, _ref31, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9;
      if (err) {
        return callback("Error transforming response, error: " + err + "\nPayload: " + xml);
      } else if ((_ref = result.Envelope) != null ? (_ref1 = _ref.Body) != null ? (_ref2 = _ref1[0]) != null ? _ref2.Fault : void 0 : void 0 : void 0) {
        fault = (_ref3 = result.Envelope) != null ? (_ref4 = _ref3.Body) != null ? (_ref5 = _ref4[0]) != null ? _ref5.Fault[0] : void 0 : void 0 : void 0;
        faultDetails = fault != null ? (_ref6 = fault.detail) != null ? (_ref7 = _ref6[0]) != null ? (_ref8 = _ref7.FelBeskrivning.map(function(it) {
          return it._;
        })) != null ? _ref8.join('. ') : void 0 : void 0 : void 0 : void 0;
        return callback(((_ref9 = fault.faultstring) != null ? (_ref10 = _ref9[0]) != null ? _ref10._ : void 0 : void 0) + ". " + faultDetails);
      } else {
        sparSvar = (_ref11 = result.Envelope) != null ? (_ref12 = _ref11.Body) != null ? (_ref13 = _ref12[0]) != null ? (_ref14 = _ref13.SPARPersonsokningSvar) != null ? (_ref15 = _ref14[0]) != null ? (_ref16 = _ref15.PersonsokningSvarsPost) != null ? _ref16[0] : void 0 : void 0 : void 0 : void 0 : void 0 : void 0;
        address = (_ref17 = (function() {
          var _i, _len, _ref18, _results;
          _ref18 = sparSvar.Adress;
          _results = [];
          for (_i = 0, _len = _ref18.length; _i < _len; _i++) {
            address = _ref18[_i];
            if (address.DatumTom[0] === '9999-12-31') {
              _results.push(address);
            }
          }
          return _results;
        })()) != null ? (_ref18 = _ref17[0]) != null ? (_ref19 = _ref18.Folkbokforingsadress) != null ? _ref19[0] : void 0 : void 0 : void 0;
        personDetaljer = (_ref20 = (function() {
          var _i, _len, _ref21, _results;
          _ref21 = sparSvar != null ? sparSvar.Persondetaljer : void 0;
          _results = [];
          for (_i = 0, _len = _ref21.length; _i < _len; _i++) {
            details = _ref21[_i];
            if (details.DatumTom[0] === '9999-12-31') {
              _results.push(details);
            }
          }
          return _results;
        })()) != null ? _ref20[0] : void 0;
        person = {
          firstName: personDetaljer != null ? (_ref21 = personDetaljer.Fornamn) != null ? _ref21[0] : void 0 : void 0,
          lastName: personDetaljer != null ? (_ref22 = personDetaljer.Efternamn) != null ? _ref22[0] : void 0 : void 0,
          id: (_ref23 = sparSvar.PersonId) != null ? (_ref24 = _ref23[0]) != null ? (_ref25 = _ref24.FysiskPersonId) != null ? _ref25[0] : void 0 : void 0 : void 0,
          address: {
            street: address != null ? (_ref26 = address.Utdelningsadress2) != null ? _ref26[0] : void 0 : void 0,
            city: address != null ? (_ref27 = address.Postort) != null ? _ref27[0] : void 0 : void 0,
            zip: address != null ? (_ref28 = address.PostNr) != null ? _ref28[0] : void 0 : void 0
          },
          secret: (sparSvar != null ? (_ref29 = sparSvar.Sekretessmarkering) != null ? _ref29[0] : void 0 : void 0) === 'Y' ? true : void 0,
          deregistrationcode: personDetaljer != null ? (_ref30 = personDetaljer.AvregistreringsorsakKod) != null ? _ref30[0] : void 0 : void 0,
          newSsn: personDetaljer != null ? (_ref31 = personDetaljer.HanvisningsPersonNrByttTill) != null ? _ref31[0] : void 0 : void 0
        };
        return callback(null, person);
      }
    });
  };

  module.exports.getPerson = getPerson;

}).call(this);
