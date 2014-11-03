xml2js = require 'xml2js'
util = require 'util'

transform = (xml, callback) ->
    parser = new xml2js.Parser({tagNameProcessors: [stripPrefix]});
    parser.parseString(xml, (err, result) ->
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

prefixMatch = new RegExp(/(?!xmlns)^.*:/);
stripPrefix = (str) ->
    return str.replace(prefixMatch, '');

exports.transform = transform;