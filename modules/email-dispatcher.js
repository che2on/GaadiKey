
var ES = require('./email-settings');
var EM = {};
module.exports = EM;

EM.server = require("emailjs/email").server.connect({

	host 	    : ES.host,
	user 	    : ES.user,
	password    : ES.password,
	ssl		    : true

});

EM.dispatchPINverificationEmail = function(email, phone, pin, callback)
{
	EM.server.send({
		from         : ES.sender,
		to           : email,
		subject      : 'Success Registering '+phone,
		text         : phone+' registered successfully and the PIN dispatched is '+pin,
		attachment   : EM.composeEmail(phone,pin)
	}, callback );
}

EM.composeEmail = function(phone,pin)
{
	var link = 'http://gaadikey.com;';
	var html = "<html><body>";
		html += "Hi Chethan,<br><br>";
		html += "A new GaadiKey user :: <b>"+phone+"</b> registered today with the PIN "+pin+"<br><br>";
		html += "<a href='"+link+"'>Click here to say this to the whole world! Congrats bro...</a><br><br>";
		html += "Cheers,<br>";
		html += "<a href='http://twitter.com/gaadikey'>gaadikey</a><br><br>";
		html += "</body></html>";
	return  [{data:html, alternative:true}];
}