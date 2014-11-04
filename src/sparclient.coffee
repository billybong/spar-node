config = require('./config.js').config
async = require 'async'
request = require 'request'
mustache = require 'mustache'
xml2js = require 'xml2js'
stripPrefix = require('xml2js').processors.stripPrefix
fs = require 'fs'

soapRequest = '''
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://skatteverket.se/spar/instans/1.0" xmlns:ns1="http://skatteverket.se/spar/komponent/1.0">
   <soapenv:Header/>
   <soapenv:Body>
      <ns:SPARPersonsokningFraga>
         <ns1:IdentifieringsInformation>
            <ns1:KundNrLeveransMottagare>{{config.kundNrLeveransMottagare}}</ns1:KundNrLeveransMottagare>
            <ns1:KundNrSlutkund>{{config.kundNrSlutkund}}</ns1:KundNrSlutkund>
            <ns1:OrgNrSlutkund>{{config.orgNrSlutkund}}</ns1:OrgNrSlutkund>
            <ns1:SlutAnvandarId>{{config.slutAnvandarId}}</ns1:SlutAnvandarId>
            <ns1:SlutAnvandarBehorighet>KAT_1</ns1:SlutAnvandarBehorighet>
            <ns1:SlutAnvandarSekretessRatt>N</ns1:SlutAnvandarSekretessRatt>
            <ns1:Tidsstampel>{{date}}</ns1:Tidsstampel>
         </ns1:IdentifieringsInformation>
         <ns1:PersonsokningFraga>
            <ns1:PersonId>
               <ns1:FysiskPersonId>{{ssn}}</ns1:FysiskPersonId>
            </ns1:PersonId>
         </ns1:PersonsokningFraga>
      </ns:SPARPersonsokningFraga>
   </soapenv:Body>
</soapenv:Envelope>
'''

agentOptions = {
        pfx: fs.readFileSync(config.clientCert),
        passphrase: config.clientCertPassword,
        securityOptions: 'SSL_OP_NO_SSLv3'
}

getPerson = (ssn, cb) ->
    model = {
        config: config,
        ssn: ssn,
        date: new Date().toISOString()
    }

    do ->
        async.waterfall [
          (callback) ->
            callback null, mustache.render(soapRequest, model)
        , (requestXml, callback) ->
            request.post {url: config.sparUrl, agentOptions: agentOptions, body: requestXml}, (error, response, body) ->
                if(error)
                    console.log(JSON.stringify(error))
                    callback(error.error)
                else
                    callback(null, body)
        , (response, callback) ->
            transformResponse response, callback
        ],
        (err, result) ->
            cb(err, result);

transformResponse = (xml, callback) ->
    parser = new xml2js.Parser({tagNameProcessors: [stripPrefix]});
    parser.parseString(xml, (err, result) ->
        if err
            callback("Error transforming response, error: #{err}\nPayload: #{xml}")
        else if result.Envelope?.Body?[0]?.Fault
            fault = result.Envelope?.Body?[0]?.Fault[0]
            faultDetails = fault?.detail?[0]?.FelBeskrivning.map((it)->it._)?.join('. ')
            callback(fault.faultstring?[0]?._ + ". " + faultDetails)
        else
            sparSvar = result.Envelope?.Body?[0]?.SPARPersonsokningSvar?[0]?.PersonsokningSvarsPost?[0]
            allAddresses = sparSvar.Adress;

            address = (address for address in allAddresses when address.DatumTom[0] == '9999-12-31')?[0]?.Folkbokforingsadress?[0]
            personDetaljer = (details for details in sparSvar?.Persondetaljer when details.DatumTom[0] == '9999-12-31')?[0]

            person = {
                firstName: personDetaljer?.Fornamn?[0],
                lastName: personDetaljer?.Efternamn?[0],
                id: sparSvar.PersonId?[0]?.FysiskPersonId?[0],
                address: {
                    street: address?.Utdelningsadress2?[0],
                    city:   address?.Postort?[0],
                    zip:    address?.PostNr?[0]
                    },
                secret: if sparSvar?.Sekretessmarkering?[0] == 'Y' then true else undefined,
                deregistrationcode : personDetaljer?.AvregistreringsorsakKod?[0],
                newSsn : personDetaljer?.HanvisningsPersonNrByttTill?[0]
                };
            callback(null, person)
    );

module.exports.getPerson = getPerson;