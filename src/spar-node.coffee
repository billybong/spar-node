express = require 'express'
config = require('./config').config
sparclient = require './sparclient'
basicAuth = require 'basic-auth'
fs = require 'fs'
https = require 'https'

auth = (req, res, next) ->
  unauthorized = (res) ->
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
    return res.sendStatus(401);

  user = basicAuth(req)

  if !user || !user.name || !user.pass
    return unauthorized(res);

  if user.name == config.sparUser && user.pass == config.sparPassword
    return next()
  else
    return unauthorized(res);

app = express()
app.use(auth)

app.param('ssn', (req, res, next, id) ->
  res.set('Content-Type', 'application/json')

  errorHandler = (error) ->
    res.status(503)
    console.error("Error calling " + config.sparUrl)
    console.error(error)
    next()

  normalHandler = (person) ->
    if person == undefined
        res.status(404)
        console.log('Did not find person with id:' + id)
        next()
    else if person.secret == true
        res.status(404)
        console.log('Person with id has secret identity:' + id)
        next()
    else if person.deregistrationcode == 'G' && person.newSsn
        console.log('Person has a new ssn:' + id)
        res.redirect(301, '/person/' + person.newSsn)
    else if person.deregistrationcode
        console.log('Person is no longer registered at SPAR:' + id)
        res.status(404)
        next()
     else
        console.log('Found person with id:' + id)
        res.send(JSON.stringify(person))
        next()

  sparclient.getPerson(id, (err, person) ->
    if err
      errorHandler(err)
    else
      normalHandler(person)
  )
)

app.get('/person/:ssn', (req, res, next) ->
  ## See app.param('ssn')
  next()
)

privateKey  = fs.readFileSync('sslcert/key.pem', 'utf8')
certificate = fs.readFileSync('sslcert/server.crt', 'utf8')

credentials = {key: privateKey, cert: certificate}

httpsServer = https.createServer(credentials, app)
httpsServer.listen(443, () ->
  host = httpsServer.address().address
  port = httpsServer.address().port

  console.log('SPAR app listening at http://%s:%s', host, port)
)