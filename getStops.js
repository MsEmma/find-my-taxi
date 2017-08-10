const request = require('request')

module.exports = () => {

	return new Promise((resolve, reject) => {

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
  	}

  	request(clientOptions, function (error, response, body) {

    	const TOKEN = JSON.parse(body).access_token;

	    var options = {
	      method: "GET",
	      headers: {
	        "Accept": "application/json",
	        "Content-Type": "application/json",
	        "Authorization": "Bearer " + TOKEN
	      },
	      url: "https://platform.whereismytransport.com//api/stops?agencies=CVVPBFb_v0KzC6cFAJGOkw&offset=200"
	    }

	    request(options, function (error, response, body) {
	      return resolve(JSON.parse(body))
	    })
  	})
	})
  .then(res => res.map(stop => {
		return {
			name: stop.name,
			geometry: stop.geometry.coordinates
		}
	}))
	.then(res => console.log("Result", res))
}
