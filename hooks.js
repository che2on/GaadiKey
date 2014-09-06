"use strict";

var _ = require("underscore");
var crypto = require("crypto");
var mongojs = require("mongojs");
var connection_string = '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var clients = db.collection("clients");
var useraccounts = db.collection("useraccounts");
var tokensToUsernames = db.collection("tokensToUsernames");

console.log("hello i am in hooks of ropc");

var database = {
    clients: {
        officialApiClient: { secret: "C0FFEE" },
        unofficialClient: { secret: "DECAF" },
        GaadiKeyClient:      { secret: "gaadi" }
    },
    users: {
        AzureDiamond: { password: "hunter2" },
        Cthon98: { password: "*********" },
        che2on:  { password: "p@ssw0rd"}
    },
    tokensToUsernames: {    
        "testtoken" : "AzureDiamond"
    }
};




function addAPIClient(data) {
    clients.insert({client_name:" " , client_secret:" " , created_on:" "}, function(err, success)
    {
        if(success)
        console.log("Was able to add client successfully");
        else
        console.log("Unable to add the client name ");

    });
}

function generateToken(data) {
    var random = Math.floor(Math.random() * 100001);
    var timestamp = (new Date()).getTime();
    var sha256 = crypto.createHmac("sha256", random + "WOO" + timestamp);

    return sha256.update(data).digest("base64");
}

exports.validateClient = function (credentials, req, cb) {
    // Call back with `true` to signal that the client is valid, and `false` otherwise.
    // Call back with an error if you encounter an internal server error situation while trying to validate.

    var isValid = _.has(database.clients, credentials.clientId) &&
                  database.clients[credentials.clientId].secret === credentials.clientSecret;
    cb(null, isValid);
};

exports.grantUserToken = function (credentials, req, cb) {
    var isValid = _.has(database.users, credentials.username) &&
                  database.users[credentials.username].password === credentials.password;
    if (isValid) {
        // If the user authenticates, generate a token for them and store it so `exports.authenticateToken` below
        // can look it up later.

        var token = generateToken(credentials.username + ":" + credentials.password);

        // trying to insert username and token
        tokensToUsernames.insert( { username:credentials.username , token: token } , function(err, success) 
        {
                if(success)
                {
                    console.log("Success assigning the token to username  ");
                }

                else
                {
                    console.log("Erro in assigning the token to the username.");
                }

        });

        database.tokensToUsernames[token] = credentials.username;

        // Call back with the token so Restify-OAuth2 can pass it on to the client.
        return cb(null, token);
    }

    // Call back with `false` to signal the username/password combination did not authenticate.
    // Calling back with an error would be reserved for internal server error situations.
    cb(null, false);
};

exports.authenticateToken = function (token, req, cb) {

    console.log("The sent token is "+token);
    if (_.has(database.tokensToUsernames, token)) {
        // If the token authenticates, set the corresponding property on the request, and call back with `true`.
        // The routes can now use these properties to check if the request is authorized and authenticated.
        req.username = database.tokensToUsernames[token];
        return cb(null, true);
    }

    // If the token does not authenticate, call back with `false` to signal that.
    // Calling back with an error would be reserved for internal server error situations.
    cb(null, false);
};
