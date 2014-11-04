exports.config = {
  sparUser : 'sparuser',
  sparPassword : 'sparpassword',
  sparUrl : 'http://localhost:8088/sparservice',

  #Stuff used in actual soap call...
  kundNrLeveransMottagare : '500243',
  kundNrSlutkund : '500243',
  orgNrSlutkund : '3102263153',
  slutAnvandarId : 'SymphonyEYCSverige-140508',

  #SSL
  clientCert: './sslcert/spar-client.p12',
  clientCertPassword: '123'
};