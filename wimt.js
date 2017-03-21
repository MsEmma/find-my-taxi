'use strict';

const request = require("request");

module.exports = function(req, res) {
  // replace with your client information: developer.whereismytransport.com/clients
  const CLIENT_ID = '709b10a8-342e-4637-8cd0-47d48107c31d';
  const CLIENT_SECRET = 'ShDVjohLxFrsiFxM7tNlVZ8QMnuENDAGjVHKpKNsxgE=';

  const clientOptions = {
      method: "POST",
      headers: "ACCEPT: application/json",
      url: "https://identity.whereismytransport.com/connect/token",
      form: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "client_credentials",
          scope: "transportapi:all"
      }
  };

  request(clientOptions, function (error, response, body) {

    const TOKEN = JSON.parse(body).access_token;

    var body = {
      geometry: {
        type: "Multipoint",
        coordinates: [[18.425059, -33.922138], [18.399267, -33.908676]]
      }
    };

    var options = {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": "Bearer " + TOKEN
      },
      url: "https://platform.whereismytransport.com/api/journeys?exclude=geometry",
      body: JSON.stringify(body)
    };

    request(options, function (error, response, body) {
      const result = JSON.parse(body)
      console.log("Directions.length", result.itineraries[2].legs.length);

      res.json(result.itineraries[2]);
    });
  });
}
