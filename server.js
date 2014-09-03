"use strict";

var restify = require("restify");
var restifyOAuth2 = require("restify-oauth2");
var hooks = require("./hooks");

// NB: we're using [HAL](http://stateless.co/hal_specification.html) here to communicate RESTful links among our
// resources, but you could use any JSON linking format, or XML, or even just Link headers.

var server = restify.createServer({
    name: "Example Restify-OAuth2 Resource Owner Password Credentials Server",
    version: "4.0.0",
    formatters: {
        "application/hal+json": function (req, res, body) {
            return res.formatters["application/json"](req, res, body);
        }
    }
});

var RESOURCES = Object.freeze({
    INITIAL: "/",
    TOKEN: "/token",
    PUBLIC: "/public",
    REGISTER: "/register",
    SECRET: "/secret",

});

server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams: false }));

// Temporarily passing  /register as TOKEN end point.

restifyOAuth2.ropc(server, { tokenEndpoint: RESOURCES.REGISTER, hooks: hooks });



server.get(RESOURCES.INITIAL, function (req, res) {
    var response = {
        _links: {
            self: { href: RESOURCES.INITIAL },
            "http://rel.example.com/public": { href: RESOURCES.PUBLIC }
        }
    };

    if (req.username) {
        response._links["http://rel.example.com/secret"] = { href: RESOURCES.SECRET };
    } else {
        response._links["oauth2-token"] = {
            href: RESOURCES.TOKEN,
            "grant-types": "password",
            "token-types": "bearer"
        };
    }

    res.contentType = "application/hal+json";
    res.send(response);
});

server.get(RESOURCES.PUBLIC, function (req, res) {
    res.send({
        "public resource": "is public",
        "it's not even": "a linked HAL resource",
        "just plain": "application/json",
        "personalized message": req.username ? "hi, " + req.username + "!" : "hello stranger!"
    });
});

// Have to test a POST request in http URL and look how the object looks like 

server.post(RESOURCES.PUBLIC, function (req, res) {
console.log("This is how the actual req object look like "+req);

console.log("Trying to print the request body "+req.body);
console.log("update");
console.log("The length of body is "+req.body.length);
for(var i=0; i< req.body.length; i++)
{

    console.log(req.body[i]);
}

req.body.forEach(function(dat) 
{
    console("body param ");
    console.log(dat);
});

var thebody = "";
request.on('data', function(data)
{
    thebody +=data;
    console.log("The data"+ data);
});

request.on('end', function()
{
    console.log(thebody);

});


console.log("Trying to get the username "+req.username);

    res.send({
        "public resource": "is public",
        "it's not even": "a linked HAL resource",
        "just plain": "application/json",
        "personalized message": req.username ? "hi, " + req.username + "!" : "hello stranger!"
    });
});




server.get(RESOURCES.REGISTER, function (req, res) {
    res.send({
        "public resource": "is REGISTER",
        "it's not even": "a linked HAL resource",
        "just plain": "application/json",
        "personalized message": req.username ? "hi, " + req.username + "!" : "hello stranger!"
    });
});

server.get(RESOURCES.SECRET, function (req, res) {
    if (!req.username) {
        return res.sendUnauthenticated();
    }

    var response = {
        "users with a token": "have access to this secret data",
        _links: {
            self: { href: RESOURCES.SECRET },
            parent: { href: RESOURCES.INITIAL }
        }
    };

    res.contentType = "application/hal+json";
    res.send(response);
});

server.listen(8081,function(){
    console.log('%s listening at %s ', server.name , server.url);
});

