const request = require('request')

const textMessage = (sender, text) => {
	let messageData = { text: text }
	sendRequest(sender, messageData)
}

const journeySummary = (sender, summary) => {
	let messageData = {

		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "list",
				"elements": [
					{
						"title": "There are 3 possible routes to your destination",
						"image_url": "https://fb-s-d-a.akamaihd.net/h-ak-fbx/v/t1.0-9/17103294_300759917007758_1443368003349594057_n.jpg?oh=e67a96ec7acb9ff0e01fc5612402f3eb&oe=5A08F2F2&__gda__=1509960767_b79aca0c3386cbb087cd592f91845532",
						"subtitle": "Below are the summary details for all routes",
					},
					{
						"title": `Route 2: Walk and use ${summary[0].noOfTaxis} taxis`,
						"subtitle": `Total distance: ${summary[0].routeDistance / 1000} km
									Total duration: ${ summary[0].routeDuration}mins
									Total fare: R${ summary[1].routeCost}`,
						"buttons": [
							{
								"type": "postback",
								"title": "Route 1",
								"payload": "route1"
							}
						]
					},
					{
						"title": `Route 2: Walk and use ${summary[1].noOfTaxis} taxis`,
						"subtitle": `Total distance: ${summary[1].routeDistance / 1000} km
									Total duration: ${ summary[1].routeDuration}mins
									Total fare: R${ summary[1].routeCost}`,
						"buttons": [
							{
								"type": "postback",
								"title": "Route 2",
								"payload": "route2"
							}
						]
					},
					{
						"title": `Route 3: Walk and use ${summary[2].noOfTaxis} taxis`,
						"subtitle": `Total distance: ${summary[2].routeDistance / 1000} km
									Total duration: ${ summary[2].routeDuration}mins
									Total fare: R${ summary[2].routeCost}`,
						"buttons": [
							{
								"type": "postback",
								"title": "Route 3",
								"payload": "route3"
							}
						]
					},
				]
			}
		}
	}
	sendRequest(sender, messageData)
}

const possibleStops = (sender, stops) => {
	let messageData = {

		"attachment":{
      "type":"template",
      "payload":{
        "template_type":"button",
        "text":"Please confirm your destination!",
        "buttons": stops.map((stop )=> {	
					return {
						"type": "postback",
						"title": stop.name,
						"payload": `to ${stop.name}`
					}		
				})
      }
    }
	}
	sendRequest(sender, messageData)
}

const location = sender => {
	let messageData = {
		"text": "Please share your location:",
		"quick_replies": [
			{
				"content_type": "location"
			}
		]
	}
	sendRequest(sender, messageData)
}

const sendRequest = (sender, messageData) => {

	return new Promise((resolve, reject) => {
		request({
			url: 'https://graph.facebook.com/v2.6/me/messages',
			qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
			method: 'POST',
			json: {
				recipient: {id:sender},
				message: messageData,
			}
		}, (error, response, body) =>
		{
			if (error) {
				console.log('Error sending messages: ', response.error)
				return reject(response.error)
			} else if (response.body.error) {
				console.log('Response body Error: ', response.body.error)
				return reject(response.body.error)
			}

			console.log("Message sent successfully to " + sender);
			return resolve(response);
		})
	})
}

exports.textMessage = textMessage
exports.journeySummary = journeySummary
exports.possibleStops = possibleStops
exports.location = location

