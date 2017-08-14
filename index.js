'use strict'

const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const request = require('request')
const R = require('ramda')
const debug = require('debug')('fmt')
const app = express()

// const getStops = require('./get-stops')
const journeyDetails = require('./get-journeys').journeyDetails
const sendTextMessage = require('./send-data').textMessage
const sendJourneySummary = require('./send-data').journeySummary
const sendLocation = require('./send-data').location

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
	// if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
	if (req.query['hub.verify_token'] === "Iphitaksi") {
		res.send(req.query['hub.challenge'])
	} else {
		debug('wrong token')
		res.send('Error, wrong token')
	}
})

// to post data
app.post('/webhook/', function (req, res) {
	const myID = 300416860375397
	const data = req.body.entry[0]
	
	if (data.messaging) {
		const messaging_events = data.messaging
		messaging_events.map(event => {
			const sender = event.sender.id
			req.sender = sender

			if (event.message && event.message.attachments && event.message.attachments.length > 0 && sender != myID) {
				const attachment = event.message.attachments[0]
				if (attachment.type === 'location') {
					const loc = attachment.payload.coordinates
					const dest = getSenderDest(sender)
					displayJourney(sender, loc, dest)
				}
			} else if (event.postback && event.postback.payload && sender != myID) {
				const text = JSON.stringify(event.postback)
				decideMessage(sender, text)
			} else if (event.message && event.message.text && sender != myID) {
				const text = event.message.text
				decideMessage(sender, text)
			}
		})
	}
	res.sendStatus(200)
})

app.use(function (err, req, res, next) {
	console.error(err.stack)
	if (req.sender) {
		sendTextMessage(req.sender, 'Oops, an internal error occurred: ' + err.message)
	}
	res.status(200).send('Something broke!')
})

let senderDest = {}

function storeSenderDest(senderId, dest) {
	console.log('storeSenderDest', senderId)
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

		const sendLegInfo = (l, nextL) => {
			if(l.mode === "Walking") {
				let msg = `Walk ${(l.distance / 1000).toFixed(2)} km for ${l.duration} minutes`
				if (nextL) {
					const dest = nextL.route.match(/^(.*) to /)[1]
					msg += ` to ${ dest }`
				}
				sendTextMessage(sender, msg)
			} else {
			// if(l.mode === "Minibus taxi"){
				sendTextMessage(sender,
				`Take a minibus taxi from ${l.route}, travel for ${(l.distance/1000).toFixed(2)} km in approx ${l.duration} minutes and trip cost is R${l.fare}`)
			}
		}

		const routeDetails = route => {
			return route.map((l, i) => {
				const interval = (i + 1) * 1000
				const nextL = i + 1 < route.length ? route[i+1] : undefined
				setTimeout(() => sendLegInfo(l, nextL), interval)
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

		debug('getStop', getStop)
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

		sendJourneySummary(sender, summary)
	})
}

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
