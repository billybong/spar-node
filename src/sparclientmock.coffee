module.exports.getPerson = (ssn, cb) ->
    cb null, {
        firstName: 'Billy',
        lastName: 'Bong',
        id: ssn,
        address: {
            street: 'Kullasundsvänge 12',
            city:   'Vaxholm',
            zip:    '18537'
            }
    };