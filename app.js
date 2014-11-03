"use stri ct";
var constants = require('constants');

var restify = require('restify');
var mongojs = require("mongojs");
var request = require("request");
var http = require('http');
var url  = require('url');
var ip_addr = '54.200.41.80';
var port    =  '443';
var restifyOAuth2 = require("restify-oauth2");
var hooks = require("./hooks");
var EM = require('./modules/email-dispatcher');
var fs = require('fs');
var connection_string = '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var jobs = db.collection("jobs");
var contacts = db.collection("contacts");
var phones = db.collection("phones");
var gaadikey_users = db.collection("gaadikey_users");
var dummycontacts = db.collection("dummycontacts");
var lookup = db.collection("lookup_yo");
var plans  = db.collection("plans");
var specifications = db.collection("specifications");
var publicgaadino_directory = db.collection("publicgaadino_directory");


// Adding Search API for Gaadi Number should be similar to job search ... 
// Should list followig things in the order

//

    //1. Gaadi Number eg: KA50Q7896 (Main Title)
    //2. Gaadi Model eg: Honda Unicorn (Secondary subtitle )
    //3. Gaai Pic    eg: fetched from gaadikey.com image !


//var profiles = db.collection("profiles");
// var sslOptions = {
//   key: fs.readFileSync('./ssl/gaadikey_in.key'),
//   cert: fs.readFileSync('./ssl/gaadikey_in.crt'),
//   ca: fs.readFileSync('./ssl/gaadikey_in.crt'),
//   requestCert: true,
//   rejectUnauthorized: false
// };

var https_server = restify.createServer({
    name : "myapp",
    //     formatters: {
    //     "application/hal+json": function (req, res, body) {
    //         return res.formatters["application/json"](req, res, body);
    //     }
    // },
    // key: fs.readFileSync('ssl/gaadikey_in.key'),
    // cert: fs.readFileSync('ssl/gaadikey_in.crt'),
    // ca: fs.readFileSync("ssl/gaadikey_in.ca-bundle"),

    secureProtocol: 'SSLv23_method',
 
  //
  // Supply `SSL_OP_NO_SSLv3` constant as secureOption to disable SSLv3
  // from the list of supported protocols that SSLv23_method supports.
  //
    secureOptions: constants.SSL_OP_NO_SSLv3,

    key: fs.readFileSync('ssl/rapid/gkey.key'),
    cert: fs.readFileSync('ssl/rapid/gkey.crt'),
    ca: fs.readFileSync("ssl/rapid/crossCA_intermediate.crt"),

    requestCert: true,
    rejectUnauthorized: false
    
});

https_server.use(restify.authorizationParser());
https_server.use(restify.bodyParser({ mapParams: false }));
https_server.use(restify.queryParser());
https_server.use(restify.CORS());


var server = restify.createServer({
    name: "myapp",
    formatters: {
        "application/hal+json": function (req, res, body) {
            return res.formatters["application/json"](req, res, body);
        }
    }
})

server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.queryParser());
server.use(restify.CORS());

var RESOURCES = Object.freeze({
    INITIAL: "/",
    TOKEN: "/token",
    PUBLIC: "/public",
    REGISTER: "/register",
    SECRET: "/secret",
});

var setup_server = function(server)
{
/* ============================================= TEST APIs should be removed after use  strictly for testing purpose only... sclean up this  to be compliant woth the security  */

var DELETE_COLLECTION_PATH = "/deletecollection";
server.get({path: DELETE_COLLECTION_PATH, version: "0.0.1"} , DeleteThisCollection );

/* =============================================TEST API section ends here ==========================================  */
var ROOT_PATH = "/";
server.get({path: ROOT_PATH, version: "0.0.1"}, callingRoot);

var PATH = '/jobs'
server.get({path : PATH , version : '0.0.1'} , findAllJobs);
server.get({path : PATH +'/:jobId' , version : '0.0.1'} , findJob);
server.post({path : PATH , version: '0.0.1'} ,postNewJob);
server.del({path : PATH +'/:jobId' , version: '0.0.1'} ,deleteJob);

var ADD_GAADINO_PATH = "/add_gaadino"
server.post({path: ADD_GAADINO_PATH, version : '0.0.1'}, addGaadiNo);

var SEARCH_PATH = "/search"
server.get({path: SEARCH_PATH, version: '0.0.1'}, searchGaadiNo);

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

var PLANARIDE_PATH  =    "/planaride"
server.post({path: PLANARIDE_PATH, version:"0.0.1"}, planARide);
var PUBLICLANE_PATH   =   "/publiclane"
server.get({ path: PUBLICLANE_PATH, version: "0.0.1"} , publicLane );

var PING_PATH = "/pingsync";
server.get({ path: PING_PATH, version: "0.0.1"} , pingSync );

var GOOGLE_VERIFY_PATH = "/google50bc7907ed872f91.html"
server.get({ path: GOOGLE_VERIFY_PATH, version: "0.0.1"}, googleVerify );


var CHECK_MEMBERSHIP_PATH = "/checkmembership";
server.get( { path: CHECK_MEMBERSHIP_PATH, version: "0.0.1"}, checkForMembership);

var AFFILIATEADS_PATH = "/affiliate_ads";
server.get({ path: AFFILIATEADS_PATH, version: "0.0.1"} , fetchAffiliateAds);

var INSERT_SPECIFICATION_PATH = "/insert_spec";
server.post({ path: INSERT_SPECIFICATION_PATH, version: "0.0.1"} , insertSpecification);


var DISPLAY_SPECIFICATION_PATH = "/display_spec";
server.get( { path: DISPLAY_SPECIFICATION_PATH, version: "0.0.1"} , displaySpecification);

// return the function which consoles.. if the given user is a member or not.
//var LOOKUP_PATH = "/lookup"
//server.post({path: LOOKUP_PATH, version:"0.0.1"} , lookup );
server.get({path: "/token", version:"0.0.1"} , tokenreq_get);
server.post({path: "/token", version:"0.0.1"} , tokenreq_post);
server.get({path: "/getCount", version:"0.0.1"} , getUserCount);
}


setup_server(server);
setup_server(https_server);

// Bind the  objects to restifyOAuth2 library.., SO all useful unauthenticated functions are accessible...
restifyOAuth2.ropc(server, {tokenEndpoint: "/token", hooks : hooks } );
restifyOAuth2.ropc(https_server, {tokenEndpoint: "/token", hooks : hooks } );

https_server.listen(443, function(){
   console.log('%s listening at %s ', https_server.name , https_server.url);
});

server.listen(80, function(){
    console.log('%s listening at %s ', server.name , server.url);
});


function addGaadiNo(req, res, next )
{
     res.setHeader('Access-Control-Allow-Origin' , '*');
     var gaadiNoObject = { };
     gaadiNoObject = req.body;
   
     publicgaadino_directory.save(gaadiNoObject, function(err, success) {
        console.log("Response  Success inserting the plan object "+success);
        if(success)
        {
            res.send(200 , success);
            return next();
        }
        else
        {
            return next(err);
        }

     });

}

function searchGaadiNo(req, res, next )
{
     res.setHeader('Access-Control-Allow-Origin' , '*');
     publicgaadino_directory.find().limit(30).sort({_id:-1}, function(err, success){
        if(success)
        {
            res.send(200 , success);
            return next();
        }
        else
        {
            return next(err);
        }
     });
}

function googleVerify(req, res, next )
{
    res.setHeader('Access-Control-Allow-Origin' , '*');
    res.send(200, "google-site-verification: google50bc7907ed872f91.html");
}

function publicLane(req, res , next )
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    gaadikey_users.find().limit(30).sort({_id:-1}, function(err, success) {
        console.log("Public lane success "+success);
        if(success)
        {
            res.send(200 , success);
            return next();
        }
        else
        {
            return next(err);
        }
    });

}

function pingSync(req, res , next )
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(200, { data : "ping test"});
}

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function onetimeNotification(notify_id)
{
    // This function is triggered as soon as user registers his profile.
    // For now considering all OS as android ...........


     // For time being considering the OS based on notifyid text

     if(notify_id.startsWith("http://")) // This is windows phone
     {
                console.log("startsWith is working ");

                var mpns = require('mpns');
                var pushUri = notify_id;
                console.log("The pushUri is "+pushUri);
                mpns.sendToast(pushUri, 'Gaadi Key', "Gaadi Key welcomes you!",'isostore:/Shared/ShellContent/yo.mp3','/WelcomesYou.xaml', function back(err,data)
                {
                    console.log(data);
                });

                console.log("This user is not an android user");


     }

     else
     {
                    console.log(" Onetime notification is being sent to the android user!");
                    var gcm=require('node-gcm');
                    var googleApiKey = "AIzaSyBVdOY12xKbvC6J4KVtzQ7axcIjk2N2sjk";
                    var sender = new gcm.Sender(googleApiKey);
                    var message = new gcm.Message();
                    message.addData('title', "Gaadi Key welcomes you!");
                    message.addData('message', "Dear valued user, Thanks for being a part of Gaadi Key.");
                    message.delay_while_idle = 1;
                    var registrationIds = [];
                    registrationIds.push(notify_id);
                    sender.send(message, registrationIds, 4, function (err, result) {
                    console.log(result);
                });

    }
                    
           
}



function DeleteThisCollection(req, res, next )
{
    res.setHeader("Access-Control-Allow-Origin" , "*");
    var collection_name_tobe_deleted = db.collection("9739888428_phoneNetworkContacts");
    console.log("before dropping the collection ");
    collection_name_tobe_deleted.drop();
    console.log("after dropping the collection  ");


}

function insertSpecification(req, res, next )
{
    console.log("Inside insert specification ");
    res.setHeader("Access-Control-Allow-Origin", "*");

     var specObject = { };
     specObject = req.body;
   
     specifications.save(specObject, function(err, success) {
        console.log("Response  Success inserting the plan object "+success);
        if(success)
        {
            res.send(200 , success);
            return next();
        }
        else
        {
            return next(err);
        }

     });



}

function displaySpecification(req, res, next )
{
    console.log("Inside display specification ");
    res.setHeader("Access-Control-Allow-Origin", "*");
    console.log("The ID in request is "+req.params.id);


    specifications.find( { id: req.params.id }, function(err, recs) 
    {
        if(err) 
        {
            console.log("No matching id and corresponding spec found! ");
            return res.send(404);

        }

        else
        {
             console.log(recs.length);
             res.send(200 , recs);
        }
    });

}


function getUserCount(req, res, next)
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    gaadikey_users.find( {}, function(err, recs) 
    {
        if(err) return res.send(404);

        else
        {
             console.log(recs.length);
             res.send(200 , { registered_users: recs.length});
        }
    })
}



function fetchAffiliateAds(req, res, next )
{

   console.log("Able to read the params " +req.params.os);

    res.setHeader("Access-Control-Allow-Origin", "*");
    if(req.params.os == "android")
    {

        var affiliate_ads  = db.collection("affiliate_ads_android");
        affiliate_ads.find({}, function(err, recs)
        {
            if(err) return res.send(404);
            else
            {
                 console.log(" The recs is "+recs.length);
                 res.send(200, recs);
            }
        });

    } 
    else if(req.params.os == "windowsphone")
    {      

    }
    else if(req.params.os == "ios")
    {

    }

    else
    {
        // if no parameter is specified  , then look for default database 
        var affiliate_ads  = db.collection("affiliate_ads_android");
        affiliate_ads.find({}, function(err, recs)
        {

            if(err) return res.send(404);
            else
            {
                 console.log(" The recs is "+recs.length);
                 res.send(200, recs);
            }

        });

   }

}


function callingRoot(req, res, next)
{
    res.send(200, "Success");
}

// Whenever there is a new joinee for the app, Do following things
// 1.find how many of them have saved his number... can range from
// 2.
// 3.

// lookup API  where it looks if the given phone number is a gaadi key user .


// recent users API where it lists out all recent users.


// function lookup(req, res, next)
// {

//     var arr = [ "9739888428" , "9739888" , "9090" , "8909" , "34232"];
//     arr.forEach(function(element)
//     {
//              gaadikey_users.findOne({phonenumber: element}, function (err, success)
//              {
//                     if(success)
//                     console.log("present"); // present
//                     else
//                     {
//                         console.log("absent"); // absent
//                     }

//                     // Once it reaches the last number send it as a json ..

//                     // this json contains people who are in the network


//              });

//     });
   
// }


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

    if (!req.username) 
    {
        return res.sendUnauthenticated();
      // The ERROR response is sent... without notifying the user.... because there is not access token sent sent in the request! 
    }

    console.log("View Notification Request Received ");
    res.setHeader('Access-Control-Allow-Origin', '*');
    lookup.find({}, function(err,result)
    {
         console.log("Result ooo is "+result);
         console.log("Error ooo is "+err);
         console.log({gkey:req.body.sendto});
    })
    lookup.findOne({gkey:req.body.sendto}, function(err, success)
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
                message.addData('title',req.body.name+" found out you have "+success.Vehicle);
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
                mpns.sendToast(pushUri, 'Gaadi Key', req.body.name+" found out you have "+success.Vehicle,'isostore:/Shared/ShellContent/yo.mp3','/Page2.xaml', function back(err,data)
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
    gaadikey_users.find().sort({$natural:1}).limit(3), function(err, success) {
        console.log("Public lane success "+success);
        if(success)
        {

            res.send(200 , success);
            return next();
        }

        else
        {
            return next(err);
        }
    }


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


// Introducing New API to list the specifications of the bike 



function getMembershipStatus( p , callback )
{
    gaadikey_users.findOne({ phonenumber : p }, function(err, success)
    {
        var responsecontactobject = { }
        console.log("Error is  "+err);
        console.log("Success is "+success);

        /* Clubb the values of contacts database with the gaadi profile database */

        //  For example
        //  { name:"" ,  vehicletype:"",  vehiclename: "" , gaadipic: "" , gaadimsg: "",  phonenumber: "",  }


        if(success!=null)
        {
            responsecontactobject = { phonenumber: p , memberstatus : "yes", vehiclename : success.vehiclename, vehicletype: success.vehicletype, gaadipic: success.gaadipic };

            callback(responsecontactobject);

        }
        else
        {
            responsecontactobject = { phonenumber:p , memberstatus : "no"};
            callback(responsecontactobject);
        }
    });
    // testing for the real phone number 
}

function checkForMembership(req, res, next )
{
    var theBIGresponse = [];
    res.setHeader('Access-Control-Allow-Origin' , '*');
    var contacts = db.collection("9986711164_phoneNetworkContacts");
    var count = 0 ;
    contacts.find().sort( { postedOn : -1}, function(err, success) {
        console.log("Response success is "+success);
        success.forEach( function (rec)
        {
                
                console.log("The phone number of this contact is "+rec.phonenumber1);
                {

                    // result is here .. 
                    if(success)
                    {
                       // responsecontactobject.phonenumber  = rec.phonenumber1;
                         getMembershipStatus(rec.phonenumber1, function(r)
                            {
                                count++;
                                console.log("The response received is "+r);
                                theBIGresponse.push(r);
                                if(success.length == count)
                                {
                                    console.log("This is the last phone numbe to be parsed. So displaying the collection of all responses.");
                                    res.send(200 , theBIGresponse);
                                }
                            });
                        
                    }
                }

            

        });
    } );
}

function dummyContacts(req, res, next) {

    res.setHeader('Access-Control-Allow-Origin','*');
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
    console.log("Able to succesfuuly able to retrieve the  phone number even though extracted from  params. here is the proof!!!! "+phno)
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


function planARide(req, res , next )
{
     var planObject = { };
     planObject.title = req.body.title;
     planObject.destination = req.body.destination;
     planObject.source = req.body.source;
     planObject.participantcount = req.body.participantcount;
     planObject.participantname = req.body.participantname;
     planObject.postedOn = new Date();
     res.setHeader('Access-Control-Allow-Origin', '*');
     plans.save(planObject, function(err, success) {
        console.log("Response  Success inserting the plan object "+success);
        if(success)
        {
            res.send(200 , success);
            return next();
        }

        else
        {
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
     // since mapParams are disabled we have to  use just body while parsing!
    var collection_name_tobe_deleted = db.collection("9739888428_phoneNetworkContacts");
    console.log("before dropping the collection ");
    collection_name_tobe_deleted.drop();
    console.log("after dropping the collection  ");
    // drop this collection 
    // colelction name  should begin with the  phonenumber received.
    var count =0;
    var phno = req.body.phonenumber;
    var phobj = { };
    phobj.book  = req.body.book;
    var phoneNetworkContacts = db.collection(phno+"_"+"phoneNetworkContacts");
    // By default drop the collection and then save the new contacts...
    // this is good for security.. SO the contacts are not leaked, incase if the another person validates the gaadikey account using the PIN .

    console.log("Drop called");
    phoneNetworkContacts.drop();
    console.log("Finished dropping");
    req.body.book.forEach(function(entry) {
        console.log("Entries are being logged");
        count++;
        console.log(entry);
        phoneNetworkContacts.save(entry , function(err, success ) {
       
        if(success)
        {
             console.log("Phone network contacts saved.");
             if(req.body.book.length == count)
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
            email = req.body.phonenumber + "@gaadikey.com";
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

    console.log("Phone number is  "+req.body.phonenumber);

    gaadikey_users.findOne( {phonenumber:req.body.phonenumber}, function(err, doc)
    {
        console.log("Error is "+err);
        console.log("The doc is "+doc);
        if(doc==null)
        {
            // since  the document is null we have to register this user. 
            // the profile object insertion code has to be present here.!! 
                console.log("this number is not registered yet");
                var profileObject = { };
                profileObject.vehicletype   = req.body.vehicletype;
                profileObject.vehiclename   = req.body.vehiclename;
                profileObject.profilepic    = req.body.profilepic;
                profileObject.gaadipic      = req.body.gaadipic;
                profileObject.gaadimsg      = req.body.gaadimsg;
                profileObject.phonenumber   = req.body.phonenumber;
                profileObject.deviceid      = req.body.deviceid;
                profileObject.notifyid      = req.body.notifyid;
                profileObject.modifiedOn      = new Date();
                res.setHeader('Access-Control-Allow-Origin' , '*');
                gaadikey_users.save(profileObject, function(err , success) {
                    console.log('Response success '+success);
                    console.log('Response error '+err);
                    if(success){

                        setTimeout(function() {onetimeNotification(req.body.notifyid); }, 30*60*1000); // This function is called after 1 minute
                     //   setTimeout(onetimeNotification(req.body.notifyid) , 5*60*1000); // This function is called after  5 minutes.
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
               vehicletype:req.body.vehicletype,
               vehiclename:req.body.vehiclename,
               profilepic:req.body.profilepic, 
               gaadipic:req.body.gaadipic,
               gaadimsg:req.body.gaadimsg,
               phonenumber:req.body.phonenumber,
               deviceid:req.body.deviceid,
               notifyid:req.body.notifyid,
               modifiedOn:new Date()

                 }};
            var query =  { phonenumber: req.body.phonenumber };
            gaadikey_users.update(query, update, function(err, result)
                {
                        if(err) { throw err; }
                        setTimeout(function() {onetimeNotification(req.body.notifyid); }, 30*60*1000); // This function is called after 1 minute
                      //  onetimeNotification(req.body.notifyid);

                        res.send(200, result);
                        return next();

                });

            //Since the document is already present ... send an error message! saying this user has already been registered. 
              // console.log("The error is "+err+" throwing it in next");
              // res.send(404);
            }

               //this user has already been registered. 
        
        
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