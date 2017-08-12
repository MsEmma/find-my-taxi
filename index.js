'use strict'

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const request = require('request')
const R = require('ramda')
const app = express()

// const getStops = require('./get-stops')
const journeyDetails = require('./get-journeys').journeyDetails
const sendRequest = require('./send-request')
const stops = require('./stops')

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

// to post data
app.post('/webhook/', function (req, res) {

	const myID = 300416860375397
	const messaging_events = req.body.entry[0].messaging

	messaging_events.map(event => {
		const sender = event.sender.id

		if (event.message && event.message.attachments && event.message.attachments.length > 0 && sender != myID) {

			const attachment = event.message.attachments[0]
			if (attachment.type === 'location') {
				const loc = attachment.payload.coordinates
				const dest = getSenderDest(sender)

				displayJourney(sender, loc, dest)
			}
      		
		} 
		if (event.postback && event.postback.payload && sender != myID) {

			const text= JSON.stringify(event.postback)
			decideMessage(sender, text)

		} 
		if (event.message && event.message.text && sender != myID) {

			const text = event.message.text
			decideMessage(sender, text)

		}
	})
	res.sendStatus(200)
})

let senderDest = {}

function storeSenderDest(senderId, dest) {
	senderDest[senderId] = dest
	return dest
}

function getSenderDest(senderId) {
	const dest = senderDest[senderId]
	if (!dest) {
		throw new Error('dest for senderId not found: ' + senderId)
	}
	return dest
}

function decideMessage(sender, textInput) {
	let text = textInput.toLowerCase()

	if (text === "hi" || text.includes("get_started_payload")){

		const messages = [
			"Welcome to Find My Taxi 😄 We will give you directions for getting around using minibus taxis. 🚌",
		 	"Right now, we can only tell you about areas near Cape Town. 🇿🇦",
		 	"Give it a try! You can type “help” at any time, or “restart” to start again.",
		 	"Where are you going? Type the name of the taxi rank."
		]

		return messages.map((message, i) => {
			const interval = (i + 1) * 1000
			setTimeout(() => { sendTextMessage(sender, message) }, interval)
		})

	} else if (text.includes("route")) {

		const routes = getSenderJourney(sender)
		// console.log('stored journey', journey)

		const checkMode = l => {
			if(l.mode === "Walking"){
				sendTextMessage(sender, `Walk ${(l.distance/1000).toFixed(2)} km for ${l.duration} minutes to the taxi stop then`)
			} else {
				sendTextMessage(sender,
				`Take a minibus taxi from ${l.route}, travel for ${(l.distance/1000).toFixed(2)} km in approx ${l.duration} minutes and trip cost is R${l.fare}`)
			}
		}

		const routeDetails = route => {

			return route.map((l, i) => {
				const interval = (i + 1) * 1000
				setTimeout(() => checkMode(l), interval)
			})
		}

		if(text.includes("route1")){
			// console.log("Route 1 details", routes[0])
			return routeDetails(routes[0])
		} 
		else if(text.includes("route2")){
			// console.log("Route 2 details", routes[1])
			return routeDetails(routes[1])
		}
		else if(text.includes("route3")){
			// console.log("Route 3 details", routes[2])
			return routeDetails(routes[2])
		}

	} else {

		const getStop = stops.filter(stop => {	
			let name = stop.name.toLowerCase()
			return name === text
		})

		if(!R.isEmpty(getStop)) {

			storeSenderDest(sender, getStop[0])
			const messages = [`Okay, let’s get you to ${text.toUpperCase()}!`, "Where are you now?"]

			messages.map((message, i) => {
				const interval = (i + 1) * 1000
				setTimeout(() => { sendTextMessage(sender, message) }, interval)
			})

			setTimeout(() => { sendLocation(sender) }, 3000)
			
		} else {
			sendTextMessage(sender, "Stop cannot be found, please type a valid destination")
		}
	}
}

function sendTextMessage(sender, text) {
	let messageData = { text:text }
	sendRequest(sender, messageData)
}

function sendGenericMessage(sender, messageData) {
	sendRequest(sender, messageData)
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
	sendRequest(sender, messageData)
}

const senderJourney = {}

function storeSenderJourney(senderId, journey) {
	senderJourney[senderId] = journey
	return journey
}

function getSenderJourney(senderId) {
	const journey = senderJourney[senderId]
	if (!journey) {
		throw new Error('journey for senderId not found: ' + senderId)
	}
	return journey
}

function displayJourney(sender, loc, dest) {

	journeyDetails(loc, dest)
	.then(result => storeSenderJourney(sender, result))
	.then(result => {

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

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
