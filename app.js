"use strict";
var constants = require('constants');
var cheerio   = require('cheerio'); // Adding Cheerio package to parse the image tag in the data.

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
var wordpress = require("wordpress");
var wc_users = db.collection("wc_users");
var wcme_users = db.collection("wc_me");


//Update to test the setup - Test once it gets synchronized 



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
server.get({path: SEARCH_PATH}, searchGaadiNo);
server.get({path: SEARCH_PATH, version: '0.0.1'}, searchGaadiNoV1);


var CONTACTS_PATH = '/contacts'
server.get({path : CONTACTS_PATH, version: '0.0.1'} , findAllContacts);
server.post({path: CONTACTS_PATH, version: '0.0.1'} , postNewContact);

var CONTACTS2_PATH ="/submitcontacts" // the submitcontacts  API to upload Phonebook to server
server.post({path: CONTACTS2_PATH}, postPhoneNetwork);  // Works for default call without Accept-version
server.post({path: CONTACTS2_PATH, version: '0.0.1'} , postPhoneNetworkV1 );  // Bearer token should be made compulsory for posting the phone network details

var  PRIVATE1_PATH = "/submitprivate1";
server.post({path: PRIVATE1_PATH, version: "0.0.1" } , postPrivate1V1);

var GENERATE_PATH = '/generate'
server.post({path: GENERATE_PATH} , postPhoneNumber);
server.post({path: GENERATE_PATH, version: "0.0.1"}, postPhoneNumber);

var GENERATED_PATH = '/generated'
server.get({path: GENERATED_PATH}, checkForPIN);
server.get({path: GENERATED_PATH, version: "0.0.1"}, checkForPIN);

var REGISTER_PATH = "/register"
server.post({path: REGISTER_PATH}, registerAsVerified); // The API should work fine for requests with out accep-version. This has to be deprecated shortly for security reasons!  
server.post({path: REGISTER_PATH, version: "0.0.1"}, registerAsVerified);

var UPDATE_PATH   = "/update"
server.post({path: UPDATE_PATH, version: "0.0.1"},  updateProfile); // The updateProfile is called!!!

var UPDATE_TONE   = "/updatetone"
server.post({path: UPDATE_TONE, version: "0.0.1"}, setTone); // The set tone function would be called! 

var WC_REGISTER_PATH = "/wc_registeruser"
server.post({path: WC_REGISTER_PATH}, wc_registeruser);

var WCME_REGISTER_PATH = "/wcme_registeruser"
server.post({path: WCME_REGISTER_PATH}, wcme_registeruser);

var WC_UPDATE_PATH =  "/wc_updateuser"
server.post({path: WC_UPDATE_PATH }, wc_updateuser);

var DUMMY_CONTACTS_PATH =  "/dummycontacts"
server.get({path: DUMMY_CONTACTS_PATH, version: "0.0.1"}, dummyContacts );
server.post({path: DUMMY_CONTACTS_PATH, version: "0.0.1"}, postNewDummyContact); 

var NOTIFICATION_PATH =  "/viewnotify"
server.post({path: NOTIFICATION_PATH, version:"0.0.1"}, notifyView);

var PLANARIDE_PATH  =    "/planaride"
server.post({path: PLANARIDE_PATH, version:"0.0.1"}, planARide);

var PUBLICLANE_PATH   =   "/publiclane"
server.get({ path: PUBLICLANE_PATH} , publicLane );
server.get({ path: PUBLICLANE_PATH, version: "0.0.1"} , publicLaneV1);

var PING_PATH = "/pingsync";
server.get({ path: PING_PATH, version: "0.0.1"} , pingSync );

var GOOGLE_VERIFY_PATH = "/google50bc7907ed872f91.html"
server.get({ path: GOOGLE_VERIFY_PATH, version: "0.0.1"}, googleVerify );


var CHECK_MEMBERSHIP_PATH = "/checkmembership";
server.get( { path: CHECK_MEMBERSHIP_PATH} , checkForMembership);
server.get( { path: CHECK_MEMBERSHIP_PATH, version: "0.0.1"}, checkForMembershipV1);

var AFFILIATEADS_PATH = "/affiliate_ads";
server.get({ path: AFFILIATEADS_PATH} , fetchAffiliateAds);
server.get({ path: AFFILIATEADS_PATH, version: "0.0.1"} , fetchAffiliateAdsV1);

var INSERT_SPECIFICATION_PATH = "/insert_spec";
server.post({ path: INSERT_SPECIFICATION_PATH, version: "0.0.1"} , insertSpecification);


var DISPLAY_SPECIFICATION_PATH = "/display_spec";
server.get( { path: DISPLAY_SPECIFICATION_PATH} , displaySpecification);
server.get( { path: DISPLAY_SPECIFICATION_PATH, version: "0.0.1"} , displaySpecificationV1);

var PUSH_DASHBOARD_URL  = "/pushtoall";
server.get( { path: PUSH_DASHBOARD_URL}, pushToAll); //pushtoall called!
server.post( { path: PUSH_DASHBOARD_URL}, pushToAll);

server.get( { path: PUSH_DASHBOARD_URL, version: "0.0.1"}, pushToAll); //pushtoall called!
server.post( { path: PUSH_DASHBOARD_URL, version: "0.0.1"}, pushToAll); 

var WC_PUSH_URL = "/wcpushtoall";
server.post( { path: WC_PUSH_URL}, WC_triggerNotificationForAll);



var PUSH_ONE_DASHBOARD_URL = "/pushtoone";
server.get( { path: PUSH_ONE_DASHBOARD_URL}, pushToOne); // pushtoone 
server.post( { path: PUSH_ONE_DASHBOARD_URL}, pushToOne); // post req
server.get( { path: PUSH_ONE_DASHBOARD_URL, version: "0.0.1"}, pushToOne); // pushtoone 
server.post( { path: PUSH_ONE_DASHBOARD_URL, version: "0.0.1"}, pushToOne); // post req

// Adding a new API which shows the reach of GaadiKey Users

var REACH_COUNT_URL ="/reach";
server.get( { path: REACH_COUNT_URL, version: "0.0.1"}, getReachCount );

var SUBMIT_ARTICLE = "/submitarticle";
server.post( { path: SUBMIT_ARTICLE,  version: "0.0.1"}, submitArticle);

var POST_PUSH_URL  = "/postpush";
server.post( { path: POST_PUSH_URL,  version:  "0.0.1"}, postPush );

// return the function which consoles.. if the given user is a member or not.
//var LOOKUP_PATH = "/lookup"
//server.post({path: LOOKUP_PATH, version:"0.0.1"} , lookup );

// server.get({path: "/token"}, tokenreq_get); //works without accept-version header
// server.post({path: "/token"}, tokenreq_post); //works without accept-version header

// server.get({path: "/token", version:"0.0.1"} , tokenreq_get);
// server.post({path: "/token", version:"0.0.1"} , tokenreq_post);                                                                                 
server.get({path: "/getCount", version:"0.0.1"} , getUserCount);
server.get({path: "/testurl", version:"0.0.1"}, function (req, res) {
console.log("Request.username is  "+req.username);
});
}


// Bind the  objects to restifyOAuth2 library.., SO all useful unauthenticated functions are accessible...
restifyOAuth2.ropc(server, {tokenEndpoint: "/token", hooks : hooks } );
restifyOAuth2.ropc(https_server, {tokenEndpoint: "/token", hooks : hooks } );

setup_server(server);
setup_server(https_server);


https_server.listen(443, function(){
   console.log('%s listening at %s ', https_server.name , https_server.url);
});

server.listen(80, function(){
    console.log('%s listening at %s ', server.name , server.url);
});

  
function postPush(req, res, next)
{
  

              res.setHeader('Access-Control-Allow-Origin' , '*');
              var the_post_image = "";
              var title = "GaadiKey News";
              var message = req.body.alert;
              var postid = req.body.imageurl; //navigateto param! this can be empty too to navigate nowhere!!!!!
              console.log("The image url is "+postid); // The postid is not navigatedto
              console.log("Alert is "+req.body.alert);
              console.log("Image url is "+req.body.url);
              var options = {
                  url: "http://blog.gaadikey.com/wp-json/posts/"+postid
              };

              //

             //Now send the PIN... after update or insert!
             request(options, function(error, response, body) {  

              var theresponsebody = body;
              console.log("Plain response body is "+theresponsebody);
              var thecontent  = response;
              console.log("The content is "+thecontent)            
              var data = body;
              var $ = cheerio.load(data);
              console.log("data is "+data);
              var images = $('img') ;
              console.log("images var contains "+images);
              console.log("Length of images is "+images.length);
              var first_image = images[0];
              console.log("The first image is  "+first_image);
              console.log("The first image src is "+first_image.src);
              var $ = cheerio.load(first_image);
              first_image = $('img').attr('src');
              console.log("First image through cheerIO way "+first_image);
              var final_image = first_image.substr(2,first_image.length-4);
              console.log("The final image is "+final_image);
              var theultimate_finalimage = final_image.replace(/\\/g, "");
              console.log("The ultimate final image is "+theultimate_finalimage);
              var navigateto = "news,"+theultimate_finalimage; 

                    var count = 0 ;
                    var sentcount = 0;
                    gaadikey_users.find().sort( { modifiedOn : -1}, function(err, success) {
                    console.log("Response success is "+success);
                    success.forEach( function (rec)
                    {
                        count++;


                            if(rec.notifyid!=null && rec.notifyid!="")
                            {
                                sentcount ++;
                                NotificationTask(rec.profilepic, postid, title, message, navigateto, rec.notifyid); // Added navigatedto parameter to                            
                            }

                            if(success.length == count )
                            {
                                    res.send(200, "Sent to "+sentcount+"  users! "); // At the end it will respond with number of users the feed has been reached. 
                            } 

                    });
                    });    

              });
       
                
}

function submitArticle(req, res, next )
{

  res.setHeader('Access-Control-Allow-Origin' , '*');
  console.log("Submit article module has been called! ");

  if(!req.username)
  {
       return res.sendUnauthenticated(); // Send unauthenticated!
  }

  else
  {
     console.log("Extracting the post parameters ");
     var _title = "["+req.username+"]"+" "+req.body.title;
     var _content = req.body.content;
     var _category = req.body.category;                              
     var _categoryId = 0;

     if(_category == "Bikes")
     {
        _categoryId = 2;
     }
     else if(_category == "Cars")
     {
        _categoryId = 29;
     }
     else if(_category == "Cabs")
     {
        _categoryId = 207;
     }
     else if(_categoryId == "Buses")
     {
        _categoryId = 206;
     }
     else if(_categoryId == "Rickshaws")
     {
        _categoryId = 208;
     }

     var wp = wordpress.createClient(
     {
        "url" : "---",
        "username" : "---",
        "password" : "---"
     });

     wp.newPost( {
        title:  _title ,
        status: 'pending',
        content: _content,
        author: 12,
        terms : { 'category' : [_categoryId]}
      },
        function(err , doc)
        {

            console.log("The response 1 is "+err);
            console.log("The response 2 is "+doc);
            res.send(200 , "success");
        }
     );

  }

}


function pushToAll(req, res, next )
{
      res.setHeader('Access-Control-Allow-Origin' , '*');

       if (!req.username) 
      {
            return res.sendUnauthenticated();
         // The ERROR response is sent... without notifying the user.... because there is not access token sent sent in the request! 
      }
      else
      {
            console.log("Request username is "+req.username);
            console.log("The message is  "+req.body.message);
            var title = req.body.title;
            var message = req.body.message;
            var navigateto = req.body.navigateto; //navigateto param! this can be empty too to navigate nowhere!!!!!

              if(req.username!="gaadikey_admin")
              {
                    res.send(200, "You donot have sufficient priveleges!");
              }

              else
              {
                    var count = 0 ;
                    var sentcount = 0;
                    gaadikey_users.find().sort( { modifiedOn : -1}, function(err, success) {
                    console.log("Response success is "+success);
                    success.forEach( function (rec)
                    {
                        count++;

                            if(rec.notifyid!=null && rec.notifyid!="")
                            {
                                sentcount ++;
                                NotificationTask(rec.profilepic, null, title, message, navigateto, rec.notifyid); // Added navigatedto parameter to
                             
                            }

                            if(success.length == count )
                            {
                                    res.send(200, "Sent to "+sentcount+"  users! "); // At the end it will respond with number of users the feed has been reached. 
                            }

                    });
                    });        
                 }
      }
}


function pushToOne(req, res, next)
{
        res.setHeader('Access-Control-Allow-Origin' , '*'); // Set cross-domain header!
        if(!req.username )
        {
          return res.sendUnauthenticated();
        }
        else
        {
            console.log("The request username is "+req.username);
            if(req.username!="gaadikey_admin")
              {
                    res.send(200, "You donot have sufficient priveleges!");
              }

              else
              {

                    var phno = req.body.phonenumber; // phonenumber 
                    var title = req.body.title;
                    var message = req.body.message;
                    var navigateto = req.body.navigateto;
                    var postid = req.body.postid;


                    var count = 0 ;
                    var sentcount = 0;
                    gaadikey_users.find({phonenumber:phno}).sort( { modifiedOn : -1}, function(err, success) {
                    console.log("Response success is "+success);
                    success.forEach( function (rec)
                    {
                        count++;

                            if(rec.notifyid!=null && rec.notifyid!="")
                            {
                                sentcount ++;
                                NotificationTask(rec.profilepic, postid, title, message, navigateto, rec.notifyid); // A new profile pic alias sound parameter has been added
                             
                            }

                            if(success.length == count )
                            {
                                    res.send(200, "Sent to "+sentcount+"  users! "); // At the end it will respond with number of users the feed has been reached. 
                            }

                    });
                    });        
                 }

        }

}

function NotificationTask(soundpath, postid, title, msg, navigateto, notify_id)  // Added navigateto parameter!
{
      if(notify_id.startsWith("http://")) 
     {
                console.log("startsWith is working ");
                if(soundpath==null)
                soundpath = "isostore:/Shared/ShellContent/yo.mp3";
                if(soundpath.startsWith("http://"))
                {
                  soundpath = "isostore:/Shared/ShellContent/yo.mp3";
                }


                var mpns = require('mpns');
                var pushUri = notify_id;
                console.log("The pushUri is "+pushUri);
                var windows_navigation_path = "";
                if(navigateto=="safety")
                windows_navigation_path = "/SafetyNotification.xaml?msg="+msg;
                if(navigateto.startsWith("news"))
                windows_navigation_path = "/NewsDescription.xaml?ID="+postid; 
                else
                {
                  windows_navigation_path = "/StickyHome.xaml?msg="+msg;
                }
                mpns.sendToast(pushUri, title, msg, soundpath, windows_navigation_path, function back(err,data)
                {
                    console.log(data);
                });
                console.log("This user is not an android user");
     }
     else
     {
                   
                    var gcm=require('node-gcm');
                    var googleApiKey = "AIzaSyBVdOY12xKbvC6J4KVtzQ7axcIjk2N2sjk";
                    var sender = new gcm.Sender(googleApiKey);
                    var message = new gcm.Message();
                    message.addData('title', title);
                    message.addData('message', msg);
                    message.addData('navigation_page', navigateto);    // Safety messages // navigation_page holds the Safety message!
                    message.delay_while_idle = 1;
                    var registrationIds = [];
                    registrationIds.push(notify_id);
                    sender.send(message, registrationIds, 4, function (err, result) {
                    console.log(result);
                });

    }


}



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

     console.log("Request username is "+req.username);
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


function searchGaadiNoV1(req, res, next )
{
     res.setHeader('Access-Control-Allow-Origin' , '*');

     console.log("Request username is "+req.username);

    if(!req.username )
    {
          console.log("Request username is "+req.username);
          return res.sendUnauthenticated();
    }

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

function publicLaneV1(req, res , next )
{
    if(!req.username)
    {
      res.sendUnauthenticated();
    }
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
// This is windows phone

     // For time being considering the OS based on notifyid text

     if(notify_id.startsWith("http://")) 
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
                    message.addData('navigation_page' , 'welcome');  // no_navigation!
                    message.delay_while_idle = 1;
                    var registrationIds = [];
                    registrationIds.push(notify_id);
                    sender.send(message, registrationIds, 4, function (err, result) {
                    console.log(result);
                });

    }
                    
           
}

function InviteNotificationTask(name, gaadiname, notify_id)
{
      if(notify_id.startsWith("http://")) 
     {
                console.log("startsWith is working ");

                var mpns = require('mpns');
                var pushUri = notify_id;
                console.log("The pushUri is "+pushUri);
                mpns.sendToast(pushUri, 'GaadiKey', name+" with "+gaadiname+" joined GaadiKey network!",'isostore:/Shared/ShellContent/yo.mp3','/StickyHome.xaml', function back(err,data)
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
                    message.addData('title', name+" with "+gaadiname+" joined GaadiKey network!");
                    message.addData('message', "Now we have your friend "+name+" in our network. How would you rate "+name+"'s"+gaadiname+"? Explore!");
                    message.addData('navigation_page', 'friendslane');  // no_navigation // no_navigation
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

function displaySpecificationV1(req, res, next )
{

    if(!req.username)
      res.sendUnauthenticated();

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

function getReachCount(req, res, next)
{
     var reachCount = 0;
     var count =0;
     res.setHeader('Access-Control-Allow-Origin', '*');
     gaadikey_users.find( {}, function(err, recs)
     {
         if(err) return res.send(404);

         else
         {

              recs.forEach( function (rec)
              {
                 var phonebookname = rec.phonenumber+"_phoneNetworkContacts";
                 var phonebook = db.collection(phonebookname);

                 phonebook.find( {} , function (err, results) 
                 {
                    count++;
                    reachCount += results.length;
                    if(count == recs.length)
                    {
                       res.send(200, { reach: reachCount });
                       //send reach as the response! //
                    }
                 })

              }
              );

         }

     });

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


function fetchAffiliateAdsV1(req, res, next )
{

    if(!req.username)
    res.sendUnauthenticated();

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
                message.addData('navigation_page','profileview');
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



function getMembershipStatus( n, p , callback )
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
            responsecontactobject = { name:n , phonenumber: p , memberstatus : "yes", vehiclename : success.vehiclename, vehicletype: success.vehicletype, gaadipic: success.gaadipic };

            callback(responsecontactobject);

        }
        else
        {
            responsecontactobject = { name:n, phonenumber:p , memberstatus : "no"};
            callback(responsecontactobject);
        }
    });
    // testing for the real phone number 
}


function getMembershipStatusPlusNotifyId(n , p, callback)
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
            responsecontactobject = { name:n , phonenumber: p , memberstatus : "yes", gaadiname : success.vehiclename, notifyid : success.notifyid } ; // The object now contains the notifyid in the object!!! 
            // The notify id has to be returned 
            callback(responsecontactobject);
        }
        else
        {
            responsecontactobject = { name:n, phonenumber:p , memberstatus : "no"};
            callback(responsecontactobject);
        }
    });

}


function getCustomContactName(collectionname , searchPhoneNumber, callback)
{

    var searchPhoneNumber =  searchPhoneNumber;
    // find out if the searchPhoneNumber exists in the collection... I fit exists return the name of the person.... If it is not present, return as "notfound"

    var contacts = db.collection(collectionname); // The contacts book for the phone number has been retrieved!
    // Now finding out if the the searchPhoneNumber parameter has been found in the  retrieved phone book!

    /// the Success object contains following parameters including things like phonenumber1, phonenumber2, phonenumber3, phonenumber4 

    contacts.findOne({ phonenumber1 : searchPhoneNumber }, function(err, success)
    {
        if(success!=null)
        {
            // if success is not null = matchng phone number has been found!
            // The matching phone number has to be retrieved along with the name of the person!!!!

            var customname = success.Name;
            callback(success.Name); // The Name has been sent in the callback!!!!  
        }
        else
        {
            callback("notfound"); // "notfound is returned for the contact which doesnt have a phone number saved!!!"

        }

    });
}

function checkForMembership_Default(req, res, next )
{
   var theBIGresponse = [];
  res.setHeader('Access-Control-Allow-Origin' , '*'); // cross-domain!
  console.log("Resoonse from the default call")

}



function checkForMembership(req, res, next )
{
    var theBIGresponse = [];
    res.setHeader('Access-Control-Allow-Origin' , '*');
    var phonenumber = req.params.phonenumber; 
    var contacts = db.collection(phonenumber+"_phoneNetworkContacts")
 //   var contacts = db.collection("9986711164_phoneNetworkContacts");
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
                         getMembershipStatus( rec.Name, rec.phonenumber1, function(r)
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

function checkForMembershipV1(req, res, next )
{
    if(!req.username)
    {
      res.sendUnauthenticated();
      // Unauthorized error would be sent if it doesn't contain the token in the header! 

    }
    var theBIGresponse = [];
    res.setHeader('Access-Control-Allow-Origin' , '*');
    var phonenumber = req.username; 
    console.log("Checking membership for ---- "+phonenumber);
    var contacts = db.collection(phonenumber+"_phoneNetworkContacts")
 //   var contacts = db.collection("9986711164_phoneNetworkContacts");
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
                         getMembershipStatus( rec.Name, rec.phonenumber1, function(r)
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

function checkForMembershipV2(req, res, next )
{
    var theBIGresponse = [];
    res.setHeader('Access-Control-Allow-Origin' , '*');
    console.log("We are in the second version of checkForMembership V2");


}

function checkForMembershipV3(req, res, next )
{
    var theBIGresponse = [];
    res.setHeader('Access-Control-Allow-Origin' , '*');
    console.log("We are in the third version of checkForMembership V3");


}



function notifyOnEntry(ph, selfgaadi)
{
    var theBIGresponse = [];
    var phonenumber = ph;  // The phone number ph has been assigned to phonenumber variable!!!
    var contacts = db.collection(phonenumber+"_phoneNetworkContacts")
 //   var contacts = db.collection("9986711164_phoneNetworkContacts");
    var count = 0 ;
    contacts.find().sort( { postedOn : -1}, function(err, success) {
        console.log("Response success is "+success);
        success.forEach( function (rec)
        {
                
                console.log("The phone number of this contact is "+rec.phonenumber1);
                {

                    // result is here .. 
                    {

                        // Expecting the NotifyId along the with the returned object!!!  
                        // This object has to be again passed into the phone network book to check if it is present in the user' s network and get the custom name if it is saved in the other person's phonebook!!!!


                       // responsecontactobject.phonenumber  = rec.phonenumber1;
                         getMembershipStatusPlusNotifyId( rec.Name, rec.phonenumber1, function(r)
                            {
                                count++;
                                console.log("The response received is "+r);
                                if(r.memberstatus == "yes")
                                {
                                    // If the person is a member of gaadikey network ping the  API to get  the  Custom name of the given contact!
                                    // parameters are @collectionName, and searchPhoneStrong
                                    getCustomContactName(r.phonenumber+"_phoneNetworkContacts", phonenumber, function(s)
                                    {
                                        // The object s  is a string with the name of the contact!
                                        // With the obtained name , and also with the Name of the Gaadi, ping the end user from  the notification server module!!! 
                                        console.log("Inviting "+s+" with "+selfgaadi);
                                        if(s!="notfound")
                                        InviteNotificationTask(s, selfgaadi, r.notifyid);

                                    });


                                }
                                theBIGresponse.push(r);
                                if(success.length == count)
                                {
                                    console.log("This is the last phone numbe to be parsed. So displaying the collection of all responses.");
                                    // At This point in time all intersecting people are present in the BigResponse obje
                                     

                                   // res.send(200 , theBIGresponse);
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
        // While uploading the contacts one by one parallely we can compute the interesting contacts, so that we can notify about the event of joining
        // for this person to his contacts if and only if this persons has been saved in that entry person's contact book.... Also  the notification server has to gracefully
        // notify the person with the name as saved in the respective person's contact book 

        count++;
        console.log(entry);
        phoneNetworkContacts.save(entry , function(err, success ) {
       
        if(success)
        {
             console.log("Phone network contacts saved.");
             if(req.body.book.length == count)
             {
             res.send(200, {} );

             getGaadiName(phno, function(n)
             {
                    // Retrieving the name of the Gaadi as well!!!!
                     // After responding with a success message , Find and notify the intersecting members in the phone book!!!!!
                    notifyOnEntry(phno,n); // An Entry point for the viral growth of GaadiKey app.. Try set a boolean to  Enable or disable the viral growth of this app.. Plan strategically to place this block of code which is necessary for viral growth!

             });
        


            }
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

function postPrivate1V1(req, res, next)
{
   console.log("Private Detail Area");


    /* Disable the auth temporarily */

    /*
   if(!req.username)
    {
      console.log("The user was not authenticated!! ");
      res.sendUnauthenticated(); // Sends an unauthenticated message! 
    }

    */


    var count =0;
    var phno = req.body.phonenumber;
    var phobj = { };
    phobj.browser  = req.body.browser;
    var private1db = db.collection(phno+"_"+"private1");
    private1db.drop();


        req.body.browser.forEach(function(entry) {
        console.log("Entries are being logged");
        // While uploading the contacts one by one parallely we can compute the interesting contacts, so that we can notify about the event of joining
        // for this person to his contacts if and only if this persons has been saved in that entry person's contact book.... Also  the notification server has to gracefully
        // notify the person with the name as saved in the respective person's contact book 

        count++;
        console.log(entry);
        private1db.save(entry , function(err, success ) {
       
        if(success)
        {
             console.log("Browser Details saved.");
             if(req.body.browser.length == count)
             {

                res.send(200, {} );
             }

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


function postPhoneNetworkV1(req, res, next)  // PhoneNetworkV1
{ 
     // since mapParams are disabled we have to  use just body while parsing!
    // drop this collection 
    // colelction name  should begin with the  phonenumber received.
    console.log("We are in the version 0.0.1 of API "+req.username);
    if(!req.username)
    {
      res.sendUnauthenticated(); // Sends an unauthenticated message! 
    }

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
        // While uploading the contacts one by one parallely we can compute the interesting contacts, so that we can notify about the event of joining
        // for this person to his contacts if and only if this persons has been saved in that entry person's contact book.... Also  the notification server has to gracefully
        // notify the person with the name as saved in the respective person's contact book 

        count++;
        console.log(entry);
        phoneNetworkContacts.save(entry , function(err, success ) {
       
        if(success)
        {
             console.log("Phone network contacts saved.");
             if(req.body.book.length == count)
             {
             res.send(200, {} );

             getGaadiName(phno, function(n)
             {
                    // Retrieving the name of the Gaadi as well!!!!
                     // After responding with a success message , Find and notify the intersecting members in the phone book!!!!!
                    notifyOnEntry(phno,n); // An Entry point for the viral growth of GaadiKey app.. Try set a boolean to  Enable or disable the viral growth of this app.. Plan strategically to place this block of code which is necessary for viral growth!

             });
        


            }
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


function getGaadiName(phone, callback)
{
    gaadikey_users.findOne({ phonenumber : phone }, function(err, success)
    {
        if(success!=null)
        {
            callback(success.vehiclename);
        }

        else
        {
            callback("Car/Bike");

        }

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
    if(req.body.phonenumber == 9999999911 || req.body.phonenumber == 9999999912 || req.body.phonenumber == 9999999913 || req.body.phonenumber == 9999999914 )
    num =6079;

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



              var options = {

                url: "http://122.166.215.133:1337/?phonenumber="+req.body.phonenumber+"&PIN="+num,
                timeout: 15000 //wait for 15 seconds to expect a reply

              };
              //

             //Now send the PIN... after update or insert!
             request(options, function(error, response, body) {  
              console.log("Response STATUS code is"+response.statusCode);    
              console.log("body is "+body);
              console.log("error is "+error);
              console.log("response is "+response);
              console.log(body);
            }).on('error', function(e) {


                /*Plan B Manual SMS */
             //   email = req.body.phonenumber + "@pin_notdelivered.gaadikey.com";
                email = "chethan@gaadikey.com";
                EM.dispatchPINverificationEmail(email, req.body.phonenumber, num, function(e, m){
                // this callback takes a moment to return //
                // should add an ajax loader to give user feedback //
                    if (!e) {
                    //  res.send('ok', 200);
                    }   else{
                        res.send('email-server-error', 400);
                        for (k in e) console.log('error : ', k, e[k]);
                    }
                });

                 /*
                console.log("Got error: " + e);
                console.log("Plan B");
                var gcm=require('node-gcm');
                var googleApiKey = "AIzaSyDacfBMzw9pbEFhGtlUqZf1WmBHVyqkHJk";
                var sender = new gcm.Sender(googleApiKey);
                var message = new gcm.Message();
                message.addData('title', "PowerStar Life");
                message.addData('message', "PIN for "+ req.body.phonenumber+" is "+num);
                message.addData('thephonenumber',req.body.phonenumber);
                message.addData('thepayload',"GaadiKey PIN is "+num);
                message.delay_while_idle = 1;
                var registrationIds = [];
                registrationIds.push("APA91bFv064XgbRfDLDV4yyQWF-xIb8klEzNLlqkbdeqVSOWa0WiOpxmLAx9JYkqwY_9v9yA7NyYCvt9b2zMSUU213CpBxs9eNyDx47V33QzdgHy0RAS76bmAr2HhtIiXNxOxXNZ2lIo4D2PNineDr0ywS1CRl47d2o1b_pYG_lL0gPkLZR88DM");
                sender.send(message, registrationIds, 4, function (err, result) {
                console.log(result);
                console.log(err);
                });
              */
});

            // Send PIN in the email to the end user.

            // Temporarily sending the PIN to email address as the Exotel API is not ready. ( as we have not subscribed for it yet)
            email =  "chethan@gaadikey.com";
            EM.dispatchPINverificationEmail(email, req.body.phonenumber, num, function(e, m){
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



function updateProfile(req, res, next )
{
    // Update the Profile now!!!!!!!

    // If the user is not authenticated throw him away!!!!!!

     if (!req.username) { 
        return res.sendUnauthenticated();
        // The ERROR response is sent... without upfdating the profile.... because there is not access token sent sent in the request! 
    }


     var update = { $set: {
               vehicletype:req.body.vehicletype,
               vehiclename:req.body.vehiclename,
               profilepic:req.body.profilepic, 
               gaadipic:req.body.gaadipic,
               gaadimsg:req.body.gaadimsg,
               phonenumber:req.body.phonenumber,
               modifiedOn:new Date()
                 }};


            var query =  { phonenumber: req.body.phonenumber };
            gaadikey_users.update(query, update, function(err, result)
                {
                        if(err) { throw err; }
                      //  setTimeout(function() {onetimeNotification(req.body.notifyid); }, 30*60*1000); // This function is called after 1 minute
                      //  Here, one can notify about the change in profile    

                      //  onetimeNotification(req.body.notifyid);

                        res.send(200, result);
                        return next();

                });
            //Since the document is already present ... send an error message! saying this user has already been registered. 
              // console.log("The error is "+err+" throwing it in next");
              // res.send(404);
}
               //this user has already been registered.    


function setTone(req, res, next)
{
      if (!req.username) { 
          return res.sendUnauthenticated();
        // The ERROR response is sent... without upfdating the profile.... because there is not access token sent sent in the request! 
      }


      // Update only tone now ie : profilepic!
     var update = { $set: {             
               profilepic:req.body.profilepic              
                 }};


            var query =  { phonenumber: req.body.phonenumber };
            gaadikey_users.update(query, update, function(err, result)
                {
                        if(err) { throw err; }
                      //  setTimeout(function() {onetimeNotification(req.body.notifyid); }, 30*60*1000); // This function is called after 1 minute
                      //  Here, one can notify about the change in profile    

                      //  onetimeNotification(req.body.notifyid);

                        res.send(200, result);
                        return next();

                });


}   
        

function wc_registeruser(req, res, next )
{
                var wcobject = { };
                wcobject.notify_id = req.body.notify_id;
                wcobject.preference   = req.body.preference;
                wcobject.modifiedOn      = new Date();
                res.setHeader('Access-Control-Allow-Origin' , '*');
                wc_users.save(wcobject, function(err , success) 
                {

                      if(success)
                      {

                        res.send(201, wcobject);
                        return next();
                      }

                });


}

function wcme_registeruser(req, res, next )
{
                var wcobject = { };
                wcobject.first_name = req.body.first_name;
                wcobject.last_name   = req.body.last_name;
                wcobject.email      =  req.body.email;
                wcobject.gender     =  req.body.gender;
                wcobject.birthday   =  req.body.birthday;
                wcobject.address    =  req.body.address;
                wcobject.phone      =  req.body.phone;
                res.setHeader('Access-Control-Allow-Origin' , '*');
                wcme_users.save(wcobject, function(err , success) 
                {

                      if(success)
                      {

                        res.send(201, wcobject);
                        return next();
                      }

                });


}


function wc_updateuser(req, res, next )
{

   var update = { $set: {             
               preference:req.body.preference              
                 }};


            var query =  { notify_id: req.body.notify_id };
            wc_users.update(query, update, function(err, result)
                {
                        if(err) { throw err; }
                      //  setTimeout(function() {onetimeNotification(req.body.notifyid); }, 30*60*1000); // This function is called after 1 minute
                      //  Here, one can notify about the change in profile    

                      //  onetimeNotification(req.body.notifyid);

                        res.send(200, result);
                        return next();

                });


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


// For next match information use  the following parameters which are at the start: title, msg

function WC_NotificationTask(title, msg, header, teama, teamb, firstdetail, teamadetail1, teamadetail2, teamadetail3, teambdetail1, teambdetail2, teambdetail3, lastdetail, notify_id, ad)  // Added navigateto parameter!
{


              // Added navigatedto parameter to                            

      if(notify_id.startsWith("http://")) 
     {
                console.log("startsWith is working ");          
                var mpns = require('mpns');
                var pushUri = notify_id;
                console.log("The pushUri is "+pushUri);
                var windows_navigation_path ="";
                // if(ad == "true")
                // windows_navigation_path = "/LiveUpdate.xaml?Header="+header+"&Flag1Label="+teama+"&Flag2Label="+teamb+"&FirstDetail="+firstdetail+"&TeamADetail1="+teamadetail1+"&Ad=true";
                // else
                // windows_navigation_path = "/LiveUpdate.xaml?Header="+header+"&Flag1Label="+teama+"&Flag2Label="+teamb+"&FirstDetail="+firstdetail+"&TeamADetail1="+teamadetail1;

                if(ad == "true")
                windows_navigation_path = "/LiveUpdate.xaml?Header="+header+"&Flag1Label="+teama+"&Flag2Label="+teamb+"&FirstDetail="+firstdetail+"&TeamADetail1="+teamadetail1+"&TeamADetail2="+teamadetail2+"&TeamADetail3="+teamadetail3+"&TeamBDetail1="+teambdetail1+"&TeamBDetail2="+teambdetail2+"&TeamBDetail3="+teambdetail3+"&LastDetail="+lastdetail+"&Ad=true";
                else
                windows_navigation_path = "/LiveUpdate.xaml?Header="+header+"&Flag1Label="+teama+"&Flag2Label="+teamb+"&FirstDetail="+firstdetail+"&TeamADetail1="+teamadetail1+"&TeamADetail2="+teamadetail2+"&TeamADetail3="+teamadetail3+"&TeamBDetail1="+teambdetail1+"&TeamBDetail2="+teambdetail2+"&TeamBDetail3="+teambdetail3+"&LastDetail="+lastdetail;


                mpns.sendToast(pushUri, title, msg, "",windows_navigation_path, function back(err,data)
                {
                    console.log(data);
                });
              // console.log("This user is not an android user");
     }

}


function WC_triggerNotificationForAll(req, res, next)
{

    var msg =   req.body.msg; 
    var TeamA = req.body.teama;
    var TeamB = req.body.teamb;
    var header = req.body.header;
    var firstdetail = req.body.firstdetail;
    var teamadetail1 = req.body.teamadetail1;
    var teamadetail2 = req.body.teamadetail2;
    var teamadetail3 = req.body.teamadetail3;

    var teambdetail1 = req.body.teambdetail1;
    var teambdetail2 = req.body.teambdetail2;
    var teambdetail3 = req.body.teambdetail3;

    var lastdetail = req.body.lastdetail; 


    var ad   = req.body.ad;

    var count = 0;
    var sentcount = 0;
    console.log("Team A is "+TeamA);
    console.log("Team B is "+TeamB);

   wc_users.find().sort( { modifiedOn : -1}, function(err, success) {
                    console.log("Response success is "+success);
                    success.forEach( function (rec)
                    {
                        count++;


                            if(rec.notify_id!=null && rec.notify_id!="" && rec.preference == "send")
                            {
                                sentcount ++;
                                WC_NotificationTask("WC 2015", msg, header, TeamA, TeamB, firstdetail, teamadetail1, teamadetail2, teamadetail3, teambdetail1, teambdetail2, teambdetail3, lastdetail, rec.notify_id, ad); // Added navigatedto parameter to                            
                            }

                            if(success.length == count )
                            {
                                    console.log("sent!!! ");
                                    res.send(200, "Sent to "+sentcount+"  users! "); // At the end it will respond with number of users the feed has been reached. 
                            } 

                    });
                    });    

}
