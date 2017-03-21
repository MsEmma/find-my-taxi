'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const wimt = require('./wimt')
const app = express()

// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.FB_PAGE_ACCESS_TOKEN
const fbToken = "EAAFePO2rmvwBAMQagXwh4uRZAMpNncMPbpnEDfi6euIiweaajflOE2DkMExFcVQYtA59MsfhWaxvfZAKnLHoJXUleZAoLpVGl1DbNe3gdUlnxZAZADxySk7VcwW5dD54q8M1VUlJwmLLHmlL6VlxR6qimjgp5UeHnYZBzstKbtXgZDZD"

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
	if (req.query['hub.verify_token'] === 'Emmalicious') {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// to post data
app.post('/webhook/', function (req, res) {
	let messaging_events = req.body.entry[0].messaging
	messaging_events.forEach(function(event){
		let sender = event.sender.id
		if (event.message && event.message.text) {
			receivedMessage(event)
			let text = event.message.text
			decideMessage(sender, text)
		} else if (event.postback) {
			receivedPostback(event)
			let text = JSON.stringify(event.postback)
			decideMessage(sender, text)
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

function decideMessage(sender, textInput) {
	let text = textInput.toLowerCase()
	if (text.includes("hi")){
		sendLocation(sender)
	} else if (text.includes("gardens")){
		sendImageMessage(sender, "http://www.gardensapartments.co.za/wp-content/themes/gardensapartments/images/home/view-from-gardens-apartment.jpg")
	} else if (text.includes("seapoint")) {
		sendGenericMessage(sender)
	} else {
		sendTextMessage(sender, "I love Camps Bay?")
		sendButtonMessage(sender, "What is your favorite place in Cape Town")
	}
}

function sendTextMessage(sender, text) {
	let messageData = { text:text }
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
            "title":"Gardens",
            "payload":"gardens"
          },
          {
            "type":"postback",
            "title":"Seapoint",
            "payload":"seapoint"
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

function sendGenericMessage(sender) {
	let messageData = {
		"attachment": {
      "type":"template",
      "payload":{
        "template_type":"generic",
        "elements":[
           {
            "title":"Seapoint",
						"image_url":"http://www.capetownlife.co.za/wp-content/uploads/2014/05/Sea-Point.jpg",
            "subtitle":"I love the sea",
            "buttons":[
              {
                "type":"web_url",
                "url":"https://en.wikipedia.org/wiki/Sea_Point",
                "title":"More about Seapoint"
              }
            ]
          }
        ]
      }
    }
	}
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

function sendRequest(sender, messageData) {
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token: fbToken},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

app.get('/wimt', wimt)

app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
