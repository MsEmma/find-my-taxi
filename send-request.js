const request = require('request')

module.exports = (sender, messageData) =>  {
  
	return new Promise((resolve, reject) => {
		request({
			url: 'https://graph.facebook.com/v2.6/me/messages',
			// qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
			qs: { access_token: "EAAFePO2rmvwBAMQagXwh4uRZAMpNncMPbpnEDfi6euIiweaajflOE2DkMExFcVQYtA59MsfhWaxvfZAKnLHoJXUleZAoLpVGl1DbNe3gdUlnxZAZADxySk7VcwW5dD54q8M1VUlJwmLLHmlL6VlxR6qimjgp5UeHnYZBzstKbtXgZDZD" },
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