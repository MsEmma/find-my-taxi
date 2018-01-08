'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const debug = require('debug')('fmt')
const app = express()

// const getStops = require('./get-stops')
const journeyDetails = require('./get-journeys').journeyDetails
const sendTextMessage = require('./send-data').textMessage
const sendJourneySummary = require('./send-data').journeySummary
const sendLocation = require('./send-data').location
const possibleStops = require('./send-data').possibleStops
const collections = require('./db').collections
// const stopps = require('./stops')

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', (req, res) => {
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
app.post('/webhook/', (req, res) => {
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
				const text = event.postback.payload
				decideMessage(sender, text)
			} else if (event.message && event.message.text && sender != myID) {
				const text = event.message.text
				decideMessage(sender, text)
			}
		})
	}
	res.sendStatus(200)
})

app.use((err, req, res, next) => {
	console.error(err.stack)
	if (req.sender) {
		sendTextMessage(req.sender, 'Oops, an internal error occurred: ' + err.message)
	}
	res.status(200).send('Something broke!')
})

let senderDest = {}

const storeSenderDest = (senderId, dest) => {
	senderDest[senderId] = dest
	return dest
}

const getSenderDest = senderId => {
	const dest = senderDest[senderId]
	if (!dest) {
		throw new Error('dest for senderId not found: ' + senderId)
	}
	return dest
}

const sendTextMessages = (sender, messages) => {
	messages.map((message, i) => {
		const interval = (i + 1) * 1000
		setTimeout(() => { sendTextMessage(sender, message) }, interval)
	})
}

const decideMessage = async (sender, textInput) => {
	let text = textInput.toLowerCase()

	if (text.includes("get_started_payload")) {

		const messages = [
			"Welcome to Find My Taxi 😄 We will give you directions for getting around using minibus taxis. 🚌",
		 	"Right now, we can only tell you about areas near Cape Town. 🇿🇦",
		 	"Give it a try! You can type “help” at any time, or “restart” to start again.",
		 	"Where are you going? Type the name of the taxi rank."
		]

		return sendTextMessages(sender, messages)

	} else if (text === "hi" ){

		sendTextMessage(sender, "Hi 😄, Where are you going? Type the name of the taxi rank.")
		
	} else if (text === "help" || text.includes("how")) {

		const messages = [
			"Find My Taxi tries to give you directions for getting around using minibus taxis 🚌 in Cape Town, South Africa.Our app is quite new, so we aplologise if it doesn’t always work perfectly.",
			"Type 'hi' to start chatting to the bot.", "Type 'restart' to start again and find a new route.",
			"Type 'about' to learn more about our team.",
			"If you need to get in touch with us, visit our Facebook page or send us a message here.We'll try to get   back to you within 24 hours."
		]

		return sendTextMessages(sender, messages)

	} else if (text.includes("route")) {

		const routes = getSenderJourney(sender)

		const sendLegInfo = (l, nextL) => {
			if(l.mode === "Walking") {
				let msg = `Walk ${(l.distance / 1000).toFixed(2)} km for ${l.duration} minutes`
				if (nextL) {
					const dest = nextL.route.match(/^(.*) to /)[1]
					msg += ` to ${ dest }`
				}
				sendTextMessage(sender, msg)
			} else {
				let msg = `Take a minibus taxi from ${l.route}, travel for ${(l.distance / 1000).toFixed(2)} km in approx ${l.duration} minutes and trip cost is R${l.fare}`
				if (nextL) {
					msg += " then"
				}
				sendTextMessage(sender, msg)
			}
		}

		const routeDetails = route => {
			return route.map((l, i) => {
				const interval = (i + 1) * 1000
				const nextL = i + 1 < route.length ? route[i+1] : undefined
				setTimeout(() => sendLegInfo(l, nextL), interval)
			})
		}

		if(text.includes("route1")) return routeDetails(routes[0]) 
		else if(text.includes("route2")) return routeDetails(routes[1])
		else if(text.includes("route3")) return routeDetails(routes[2])

	} else if (textInput.startsWith("to ")) {

		const stop = textInput.replace("to ", "")
		const { Stops } = await collections
		const destination = await Stops.findOne({ name: stop })

		storeSenderDest(sender, destination)
		const messages = [`Okay, let’s get you ${textInput}!`, "Where are you now?"]
		sendTextMessages(sender, messages)
		setTimeout(() => { sendLocation(sender) }, 3000)			
		
	} else {

		const { Stops } = await collections

		const stops = await Stops.find(
			{ $text: { $search: text }},
   		{ score: { $meta: "textScore" }}
		).sort({ score: { $meta: "textScore" }})
		.limit(3)
		.toArray()

		console.log("Stops", stops)
		debug('Stops', stops)

		stops && stops.length > 0 ? possibleStops(sender, stops) :
		sendTextMessage(sender, "Stop cannot be found, please type a valid destination")
		
	}
}

const senderJourney = {}

const storeSenderJourney = (senderId, journey) => {
	senderJourney[senderId] = journey
	return journey
}

const getSenderJourney = senderId => {
	const journey = senderJourney[senderId]
	if (!journey) {
		throw new Error('journey for senderId not found: ' + senderId)
	}
	return journey
}

const displayJourney = async (sender, loc, dest) => {

	const details = await journeyDetails(loc, dest)
	storeSenderJourney(sender, details)
	
	const summary = details.map(route => {

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
	
}

app.listen(app.get('port'), () => {
	console.log('running on port', app.get('port'))
})
