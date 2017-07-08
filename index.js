'use strict'

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send("Hi I am an awesome chatbot")
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// whereismytransport api call
function wimtAPICall(loc) {

	let long = loc.long
	let lat = loc.lat

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

    	var body = {
      	geometry: {
        	type: "Multipoint",
        	coordinates: [[long, lat], [18.5317533, -33.9456557]]
      	}
    	}

	    var options = {
	      method: "POST",
	      headers: {
	        "Accept": "application/json",
	        "Content-Type": "application/json",
	        "Authorization": "Bearer " + TOKEN
	      },
	      url: "https://platform.whereismytransport.com/api/journeys",
	      body: JSON.stringify(body)
	    }

	    request(options, function (error, response, body) {
	      return resolve(JSON.parse(body))
	    })
  	})
	})
}

// to post data
app.post('/webhook/', function (req, res) {
	let myID = 300416860375397
	let messaging_events = req.body.entry[0].messaging
	messaging_events.forEach(function(event){
		let sender = event.sender.id

		if (event.message && event.message.attachments && event.message.attachments.length > 0 && sender != myID) {
			let attachment = event.message.attachments[0];
      if (attachment.type === 'location') {
				receivedLocation(event)
				let text = event.message.attachments[0].title
				let loc = attachment.payload.coordinates
				displayJourneySummary(sender, loc)
      }
    } else if (event.postback && event.postback.payload && sender != myID) {
			receivedPostback(event)
			let text= JSON.stringify(event.postback)
			decideMessage(sender, text)
    } else {
      if (event.message && event.message.text && sender != myID) {
				receivedMessage(event)
				let text = event.message.text
				decideMessage(sender, text)
      }
    }
	})
	res.sendStatus(200)
})

// Incoming events handling
function receivedMessage(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfMessage = event.timestamp;
  const message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));
}

function receivedPostback(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;
  const payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);
}

function receivedLocation(event) {
  const senderID = event.sender.id;
  const recipientID = event.recipient.id;
  const timeOfPostback = event.timestamp;
  const payload = event.message.attachments[0].payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);
}

function decideMessage(sender, textInput) {
	let text = textInput.toLowerCase()

	if (text.includes("hi") || text.includes("get_started_payload")){
		setTimeout(() => {
    	sendTextMessage(sender, "Welcome to Find My Taxi 😄 We will give you directions for getting around using minibus taxis. 🚌")
		}, 1000)
		setTimeout(() => {
    	sendTextMessage(sender, "Right now, we can only tell you about areas near Cape Town. 🇿🇦")
		}, 2000)
		setTimeout(() => {
    	sendTextMessage(sender, "Give it a try! You can type “help” at any time, or “restart” to start again.")
		}, 3000)
		setTimeout(() => {
    	sendTextMessage(sender, "Where are you going? Type the name of the taxi rank.")
		}, 4000)

	} else if (text.includes("lat")) {

    return displayJourneySummary(sender, loc)

	} else if (text.includes("greenpoint")) {

		setTimeout(() => {
    	sendTextMessage(sender, "Okay, let’s get you to Greenpoint! ")
		}, 1000)
		setTimeout(() => {
    	sendTextMessage(sender, "Where are you now?")
		}, 2000)
		setTimeout(() => {
    	sendLocation(sender)
		}, 3000)

	} else if (text.includes("langa")) {

		setTimeout(() => {
    	sendTextMessage(sender, "Okay, let’s get you to Langa! ")
		}, 1000)
		setTimeout(() => {
    	sendTextMessage(sender, "Where are you now?")
		}, 2000)
		setTimeout(() => {
    	sendLocation(sender)
		}, 3000)

	} else if (text.includes("route")) {

    sendTextMessage(sender, "Happy travels")

	}
	// else {
	// 	sendTextMessage(sender, "Where would you like to go?")
	// 	sendButtonMessage(sender, "Choose your destination")
	// }
}

function sendTextMessage(sender, text) {
	let messageData = { text:text }
	sendRequest(sender, messageData)
}

function sendGenericMessage(sender, messageData) {
	sendRequest(sender, messageData)
}

function sendButtonMessage(sender, text) {
	let messageData = {
		"attachment":{
      "type":"template",
      "payload":{
        "template_type":"button",
        "text": text,
        "buttons":[
          {
            "type":"postback",
            "title":"Langa",
            "payload":"langa"
          },
          {
            "type":"postback",
            "title":"Greenpoint",
            "payload":"greenpoint"
          }
        ]
      }
    }
	}
	sendRequest(sender, messageData)
}

// For sending image attachment
function sendImageMessage(sender, imageURL) {
	let messageData = {
		"attachment":{
      "type":"image",
      "payload":{
        "url": imageURL
      }
    }
	}
	sendRequest(sender, messageData)
}

function journeyDetails(loc) {

	return wimtAPICall(loc)
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
	.then(l => {
		return l
	})
}

function displayJourneySummary(sender, loc) {

	journeyDetails(loc)
	.then(result => {

		console.log("Result", result)

		const summary = result.map(route => {

			let routeDistance = 0,
					routeDuration = 0,
					routeCost = 0,
					noOfTaxis = 0

			route.map(leg => {

				if(leg.mode === "Minibus taxi"){
						noOfTaxis++
						routeCost += leg.fare
					}
					routeDistance += leg.distance
					routeDuration += leg.duration
				})

			return {
				routeDistance,
				routeDuration,
				routeCost,
				noOfTaxis
			}
		})

		console.log("Summary", summary)

		let messageData = {

	    "attachment": {
	        "type": "template",
	        "payload": {
            "template_type": "list",
            "elements": [
							{
                    "title": "There are 3 possible routes to your destination",
                    "image_url": "Logo.png",
                    "subtitle": "Below are the summary details for all routes",
							},
              {
                "title": `Route 2: Walk and use ${ summary[0].noOfTaxis } taxis`,
                "subtitle": `Total distance: ${ summary[0].routeDistance/1000 } km
								Total duration: ${ summary[0].routeDuration }mins
								Total fare: R${ summary[1].routeCost }`,
                "buttons": [
									{
				            "type":"postback",
				            "title":"Route 1",
				            "payload":"route1"
				          }
                ]
              },
              {
                "title": `Route 2: Walk and use ${ summary[1].noOfTaxis } taxis`,
                "subtitle": `Total distance: ${ summary[1].routeDistance/1000 } km
								Total duration: ${ summary[1].routeDuration }mins
								Total fare: R${ summary[1].routeCost }`,
                "buttons": [
									{
				            "type":"postback",
				            "title":"Route 2",
				            "payload":"route2"
				          }
                ]
              },
              {
                "title": `Route 3: Walk and use ${ summary[2].noOfTaxis } taxis`,
                "subtitle": `Total distance: ${ summary[2].routeDistance/1000 } km
								Total duration: ${ summary[2].routeDuration }mins
								Total fare: R${ summary[2].routeCost }`,
                "buttons": [
									{
				            "type":"postback",
				            "title":"Route 3",
				            "payload":"route3"
				          }
                ]
              },
          	]
	      	}
	    	}
	  }

		sendGenericMessage(sender, messageData)
	})
}

function sendLocation(sender) {
	let messageData = {
    "text":"Please share your location:",
    "quick_replies":[
      {
        "content_type":"location"
      }
    ]
  }
	console.log("Response", messageData);
	sendRequest(sender, messageData)
}

function sendRequest(sender, messageData) {
	return new Promise((resolve, reject) => {
		request({
			url: 'https://graph.facebook.com/v2.6/me/messages',
			qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
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

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
