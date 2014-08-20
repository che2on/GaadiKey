
var ES = require('./email-settings');
var EM = {};
module.exports = EM;

EM.server = require("emailjs/email").server.connect({

	host 	    : ES.host,
	user 	    : ES.user,
	password    : ES.password,
	ssl		    : true

});

EM.dispatchPINverificationEmail = function(email, pin, callback)
{
	EM.server.send({
		from         : ES.sender,
		to           : email,
		subject      : 'GaadiKey Verification PIN is '+pin,
		text         : 'The Gaadi Key verification.',
		attachment   : EM.composeEmail(pin)
	}, callback );
}

EM.composeEmail = function(o)
{
	var link = 'http://gaadikey.com;';
	var html = "<html><body>";
		html += "Hi yo,<br><br>";
		html += "Your Gaadi Key Verification PIN is :: <b>"+pin+"</b><br><br>";
		html += "<a href='"+link+"'>Click here to know more about GaadiKey</a><br><br>";
		html += "Cheers,<br>";
		html += "<a href='http://twitter.com/gaadikey'>gaadikey</a><br><br>";
		html += "</body></html>";
	return  [{data:html, alternative:true}];
}