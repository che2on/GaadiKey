"use strict";

var restify = require('restify');
var mongojs = require("mongojs");
var request = require("request");
var http = require('http');
var url  = require('url');
var ip_addr = '54.200.41.80';
var port    =  '80';
var restifyOAuth2 = require("restify-oauth2");
var hooks = require("./hooks");
var EM = require('./modules/email-dispatcher');


var connection_string = '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var jobs = db.collection("jobs");
var contacts = db.collection("contacts");
var phones = db.collection("phones");
var gaadikey_users = db.collection("gaadikey_users");
var dummycontacts = db.collection("dummycontacts");
var lookup = db.collection("lookup_yo");
//var profiles = db.collection("profiles");

var server = restify.createServer({
    name : "myapp",
        formatters: {
        "application/hal+json": function (req, res, body) {
            return res.formatters["application/json"](req, res, body);
        }
    }
});

server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams: false }));

var RESOURCES = Object.freeze({
    INITIAL: "/",
    TOKEN: "/token",
    PUBLIC: "/public",
    REGISTER: "/register",
    SECRET: "/secret",

});

server.use(restify.queryParser());
//server.use(restify.bodyParser());
server.use(restify.CORS());
server.listen(port, function(){
    console.log('%s listening at %s ', server.name , server.url);
});


// Bind the  objects to restifyOAuth2 library.., SO all useful unauthenticated functions are accessible...

restifyOAuth2.ropc(server, {tokenEndpoint: "/token", hooks : hooks } );


/*
var app = express();
app
.use(express.vhost('accounts.tweetaly.st', require('./node-login/app.js').app))
.use(express.vhost('tweetaly.st', require('./tweetalystpro/app.js').app))
.use(express.vhost('blog.tweetaly.st', require('./blog/app.js').app))
.use(express.vhost('tv.tweetaly.st', require('./tv/app.js').app ))
.listen(80);
*/



var PATH = '/jobs'
server.get({path : PATH , version : '0.0.1'} , findAllJobs);
server.get({path : PATH +'/:jobId' , version : '0.0.1'} , findJob);
server.post({path : PATH , version: '0.0.1'} ,postNewJob);
server.del({path : PATH +'/:jobId' , version: '0.0.1'} ,deleteJob);


var CONTACTS_PATH = '/contacts'
server.get({path : CONTACTS_PATH, version: '0.0.1'} , findAllContacts);
server.post({path: CONTACTS_PATH, version: '0.0.1'} , postNewContact);

var CONTACTS2_PATH ="/submitcontacts"
server.post({path: CONTACTS2_PATH, version: '0.0.1'} , postPhoneNetwork );


var GENERATE_PATH = '/generate'
server.post({path: GENERATE_PATH, version: "0.0.1"}, postPhoneNumber);

var GENERATED_PATH = '/generated'
server.get({path: GENERATED_PATH, version: "0.0.1"}, checkForPIN);

var REGISTER_PATH = "/register"
server.post({path: REGISTER_PATH, version: "0.0.1"}, registerAsVerified);

var DUMMY_CONTACTS_PATH =  "/dummycontacts"
server.get({path: DUMMY_CONTACTS_PATH, version: "0.0.1"}, dummyContacts );
server.post({path: DUMMY_CONTACTS_PATH, version: "0.0.1"}, postNewDummyContact); 

var NOTIFICATION_PATH =  "/viewnotify"
server.post({path: NOTIFICATION_PATH, version:"0.0.1"}, notifyView);

server.get({path: "/token", version:"0.0.1"} , tokenreq_get);
server.post({path: "/token", version:"0.0.1"} , tokenreq_post);

function tokenreq_get(req, res, next)
{
    console.log("The get request has been reached ");
}

function tokenreq_post(req, res, next)
{

    console.log("The post request has been reached ...");
}

function notifyView(req, res, next)
{
    console.log("View Notification Request Received ");
    res.setHeader('Access-Control-Allow-Origin', '*');
    lookup.find({}, function(err,result)
    {
         console.log("Result ooo is "+result);
         console.log("Error ooo is "+err);
         console.log({gkey:req.params.sendto});
    })
    lookup.findOne({gkey:req.params.sendto}, function(err, success)
    {
        console.log("Error is "+err);
        console.log("The doc is "+success);
        if(success)
        {
            if(success.os=="android")
            {
                console.log("This user is an android user");
                var gcm=require('node-gcm');
                var googleApiKey = "AIzaSyBVdOY12xKbvC6J4KVtzQ7axcIjk2N2sjk";
                var sender = new gcm.Sender(googleApiKey);
                var message = new gcm.Message();
                message.addData('title',req.params.name+" found out you have "+success.Vehicle);
                message.addData('message', success.name+", Your Gaadi Key profile has been viewed.. Want to update?");
                message.delay_while_idle = 1;
                var registrationIds = [];
                registrationIds.push(success.notify_id);
                sender.send(message, registrationIds, 4, function (err, result) {
                console.log(result);
                });
            }
            else
            {

                var mpns = require('mpns');
                var pushUri = success.notify_id;
                console.log("The pushUri is "+pushUri);
                mpns.sendToast(pushUri, 'Gaadi Key', req.params.name+" found out you have "+success.Vehicle,'isostore:/Shared/ShellContent/yo.mp3','/Page2.xaml', function back(err,data)
                {
                    console.log(data);
                });

               

                console.log("This user is not an android user");
            }

            res.send(200 , success) ;
            return next();
        }

            console.log("Throwing Error "+err);
            res.send(404 , success) ;
            //return next(err);

    })

}

function checkForPIN(req, res, next)
{

    console.log("Request for checking PIN received from the phone number "+req.params.phonenumber);
    res.setHeader('Access-Control-Allow-Origin', '*');
    phones.findOne( {phonenumber:req.params.phonenumber}, function(err, doc)
    {
        console.log("Error is "+err);
        console.log("The doc is "+doc);
        if(doc)
        {
            res.send(200 , doc) ;
            return next();
        }
        else
        {
            return next(err);
        }
    });


}




function verify(req, res, next)
{

    res.setHeader('Access-Control-Allow-Origin', '*');


}

function findAllContacts(req, res, next) 
{

    res.setHeader('Access-Control-Allow-Origin','*');
    contacts.find().limit(20).sort({postedOn : -1} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }else{
            return next(err);
        }
 
    });

}

function dummyContacts(req, res, next) {

    // res.setHeader('Access-Control-Allow-Origin','*');
    // dummycontacts.find().limit(20).sort({Name : -1} , function(err , success){
    //     console.log('Response success '+success);
    //     console.log('Response error '+err);
    //     if(success){
    //         res.send(200 , success);
    //         return next();
    //     }else{
    //         return next(err);
    //     }
 
    // });

     console.log("The username is "+req.username) ;
     if (!req.username) {
        return res.sendUnauthenticated();
        // The ERROR response is sent... without upfdating the profile.... because there is not access token sent sent in the request! 
    }


    var phno = req.params.phonenumber;
    res.setHeader('Access-Control-Allow-Origin','*');
    var phoneNetworkContacts = db.collection(phno+"_"+"phoneNetworkContacts");
    console.log("Querying the db "+phno+"_"+"phoneNetworkContacts")
    phoneNetworkContacts.find().limit(40).sort({postedOn : -1} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }else{
            return next(err);
        }
 
    });


}


function postNewContact(req, res, next) {

    var userObject = { };
    userObject.title = req.params.title;
    userObject.description = req.params.description;
    userObject.location = req.params.location;
    userObject.phonebook = req.params.contactdetails;
    userObject.postedOn  = new Date();
    res.setHeader('Access-Control-Allow-Origin','*');
    contacts.save(userObject , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(201 , userObject);
            return next();
        }else{
            return next(err);
        }
    });
}

function postPhoneNetwork(req, res, next) 
{

     

    var count =0;
    var phno = req.params.phonenumber;
    var phobj = { };
    phobj.book  = req.params.book;
    var phoneNetworkContacts = db.collection(phno+"_"+"phoneNetworkContacts");
    req.params.book.forEach(function(entry) {
        count++;
        console.log(entry);
        phoneNetworkContacts.save(entry , function(err, success ) {
       
        if(success)
        {
             console.log("Phone network contacts saved.");
             if(req.params.book.length == count)
             res.send(200, {} );
             return next();
        }
        else
        {
            //res.send(404);
            return next();
        }
    });

    });

    
   

}

/*
function postProfileDetails(req, res, next) {

    var profileObject = { };
    profileObject.vehicletype = req.params.vehicletype;
    profileObject.vehiclename = req.params.vehiclename;
    profileObject.profilepic = req.params.profilepic;
    profileObject.gaadipic  = req.params.gaadipic;
    profileObject.gaadimsg  = req.params.gaadimsg;
    profileObject.modifiedOn = new Data();
    res.setHeader('Access-Control-Allow-Origin' , '*');
    profiles.save(profileObject, function(err , success) {
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(201, profileObject);
            return next();
        }
        else
        {
            return nexy
        }
    })

}
*/

function postPhoneNumber(req, res, next) {

    //Generate 4 digit Random Number 

    console.log("The flow is here! ");
    console.log("The requested url is "+req.url);
    console.log("reading the parameter directly from the body "+req.body.phonenumber);
    var queryObject = url.parse(req.url , true); 

    var min = 1000;
    var max = 9999;
    console.log("Is this Phone number" +queryObject.phonenumber);

    var num = Math.floor(Math.random() * (max - min + 1)) + min;

    var phoneObject = { };
    var email;
    email = req.body.email;
    phoneObject.phonenumber = req.body.phonenumber;
    phoneObject.deviceid    = req.body.deviceid;
    phoneObject.PIN         = num;
    res.setHeader('Access-Control-Allow-Origin', '*');

    phones.findOne({phonenumber:req.body.phonenumber} , function ( err, success )
    {
        if(success)
        {
            console.log("This Phone is already present. Updating the PIN. ")
            var update = { $set: { PIN:num}};
            var query =  { phonenumber: req.body.phonenumber };
            phones.update(query, update, function(err, result)
                {
                        if(err) { throw err; }

                        res.send(200, result);
                        return next();

                });
        }

        else
        {

            phones.save(phoneObject, function( err, success){
        console.log("Response success "+success);
        console.log("Response error "+err);
        if(success) {
            console.log("Success saving the phone number "+phoneObject);
            
       
            res.send(200, success);
            return next();
        } else
        {
            console.log("Error saving the phone number "+phoneObject);

            return next(err);
        }
        });


        }
             //Now send the PIN... after update or insert!
             request("http://122.166.215.133:1337/?phonenumber="+req.body.phonenumber+"&PIN="+num, function(error, response, body) {      
              console.log("body is "+body);
              console.log("error is "+error);
              console.log("response is "+response);
              console.log(body);
            });

            // Send PIN in the email to the end user.

            // Temporarily sending the PIN to email address as the Exotel API is not ready. ( as we have not subscribed for it yet)

            EM.dispatchPINverificationEmail(email, num, function(e, m){
                // this callback takes a moment to return //
                // should add an ajax loader to give user feedback //
                    if (!e) {
                    //  res.send('ok', 200);
                    }   else{
                        res.send('email-server-error', 400);
                        for (k in e) console.log('error : ', k, e[k]);
                    }
                });


    })


}

function registerAsVerified(req, res, next )
{

    if (!req.username) {
        return res.sendUnauthenticated();
        // The ERROR response is sent... without upfdating the profile.... because there is not access token sent sent in the request! 
    }

    console.log("Phone number is  "+req.params.phonenumber);

    gaadikey_users.findOne( {phonenumber:req.params.phonenumber}, function(err, doc)
    {
        console.log("Error is "+err);
        console.log("The doc is "+doc);
        if(doc==null)
        {
            // since  the document is null we have to register this user. 
            // the profile object insertion code has to be present here.!! 
                console.log("this number is not registered yet");
                var profileObject = { };
                profileObject.vehicletype   = req.params.vehicletype;
                profileObject.vehiclename   = req.params.vehiclename;
                profileObject.profilepic    = req.params.profilepic;
                profileObject.gaadipic      = req.params.gaadipic;
                profileObject.gaadimsg      = req.params.gaadimsg;
                profileObject.phonenumber   = req.params.phonenumber;
                profileObject.deviceid      = req.params.deviceid;
                profileObject.notifyid      = req.params.notifyid;
                profileObject.modifiedOn      = new Date();
                res.setHeader('Access-Control-Allow-Origin' , '*');
                gaadikey_users.save(profileObject, function(err , success) {
                    console.log('Response success '+success);
                    console.log('Response error '+err);
                    if(success){
                        res.send(201, profileObject);
                        return next();
                    }
                    else
                    {
                        console.log("error in profile object insertion")
                        res.send(404);
                        return next();
                        //return next(404);
                    }
                });


           //res.send(200 , doc) ;
           //return next();
        }
        else
        {



            var update = { $set: {
               vehicletype:req.params.vehicletype,
               vehiclename:req.params.vehiclename,
               profilepic:req.params.profilepic, 
               gaadipic:req.params.gaadipic,
               gaadimsg:req.params.gaadimsg,
               phonenumber:req.params.phonenumber,
               deviceid:req.params.deviceid,
               notifyid:req.params.notifyid,
               modifiedOn:new Date()

                 }};
            var query =  { phonenumber: req.params.phonenumber };
            gaadikey_users.update(query, update, function(err, result)
                {
                        if(err) { throw err; }

                        res.send(200, result);
                        return next();

                });

            //Since the document is already present ... send an error message! saying this user has already been registered. 
              // console.log("The error is "+err+" throwing it in next");
              // res.send(404);
               return next();
              // return next(404);

               //this user has already been registered. 
        
        }
    });
}


function findAllJobs(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    jobs.find().limit(20).sort({postedOn : -1} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }else{
            return next(err);
        }
 
    });
 
}


function findAllJobs(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    jobs.find().limit(20).sort({postedOn : -1} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }else{
            return next(err);
        }
 
    });
 
}
 
function findJob(req, res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    jobs.findOne({_id:mongojs.ObjectId(req.params.jobId)} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(200 , success);
            return next();
        }
        return next(err);
    })
}
 
function postNewJob(req , res , next){
    var job = {};
    job.title = req.params.title;
    job.description = req.params.description;
    job.location = req.params.location;
    job.postedOn = new Date();
 
    res.setHeader('Access-Control-Allow-Origin','*');
 
    jobs.save(job , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(201 , job);
            return next();
        }else{
            return next(err);
        }
    });
}

function postNewDummyContact(req , res , next){
    var dummyContact = {};
    dummyContact.Name =     req.params.Name;
    dummyContact.ImgUrl =   req.params.ImgUrl;
    dummyContact.Des =      req.params.Des;
    dummyContact.gkey=      req.params.gkey;  
    res.setHeader('Access-Control-Allow-Origin','*');
 
    dummycontacts.save(dummyContact , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(201 , dummyContact);
            return next();
        }else{
            return next(err);
        }
    });
}



 
function deleteJob(req , res , next){
    res.setHeader('Access-Control-Allow-Origin','*');
    jobs.remove({_id:mongojs.ObjectId(req.params.jobId)} , function(err , success){
        console.log('Response success '+success);
        console.log('Response error '+err);
        if(success){
            res.send(204);
            return next();      
        } else{
            return next(err);
        }
    })
 
}
