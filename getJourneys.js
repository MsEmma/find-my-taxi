const request = require('request')

// whereismytransport api call
function getJourneys(loc, dest) {

	console.log("Location", loc)
	console.log("Destination", dest)

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

			const params = {
				geometry: {
					type: "Multipoint",
					coordinates: [[loc.long, loc.lat], dest.coordinates]
				}
			}

			const options = {
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json",
					"Authorization": "Bearer " + TOKEN
				},
				url: "https://platform.whereismytransport.com/api/journeys",
				body: JSON.stringify(params)
			}

			request(options, function (error, response, body) {
				return resolve(JSON.parse(body))
			})
		})
	})
}

function journeyDetails(loc, dest) {

	return getJourneys(loc, dest)
	.then(result => {
		return result.itineraries.map(itinerary => {
			return itinerary.legs
		})
	})
	.then(legs => {
		return legs.map(leg => {
			return leg.map(lp => {
				if(lp.type === "Transit") {
					return {
						mode: "Minibus taxi",
						distance: lp.distance.value,
						route: lp.line.name,
						fare: lp.fare.cost.amount,
						duration: Math.round(lp.duration/60)
					}
				} else {
					return {
						mode: lp.type,
						distance: lp.distance.value,
						duration: Math.round(lp.duration/60),
						directions: lp.directions.map(dir =>{
							return `${dir.instruction} for ${dir.distance.value}m`
						})
					}
				}
			})
		})
	})
}

exports.journeyDetails = journeyDetails
