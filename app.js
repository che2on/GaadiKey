var restify = require('restify');
var mongojs = require("mongojs");

var ip_addr = '54.200.41.80';
var port    =  '80';


var EM = require('./modules/email-dispatcher');


var connection_string = '127.0.0.1:27017/myapp';
var db = mongojs(connection_string, ['myapp']);
var jobs = db.collection("jobs");
var contacts = db.collection("contacts");
var phones = db.collection("phones");
//var profiles = db.collection("profiles");

var server = restify.createServer({
    name : "myapp"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());
 
server.listen(port, function(){
    console.log('%s listening at %s ', server.name , server.url);
});


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


var GENERATE_PATH = '/generate'
server.post({path: GENERATE_PATH, version: "0.0.1"}, postPhoneNumber);

var GENERATED_PATH = '/generated'
server.get({path: GENERATED_PATH, version: "0.0.1"}, checkForPIN);



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
function findAllContacts(req, res, next) {

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
})


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

    var min = 1000;
    var max = 9999;
    var num = Math.floor(Math.random() * (max - min + 1)) + min;


    var phoneObject = { };
    var email;
    email = req.params.email;
    phoneObject.phonenumber = req.params.phonenumber;
    phoneObject.deviceid    = req.params.deviceid;
    phoneObject.PIN         = num;
    res.setHeader('Access-Control-Allow-Origin', '*');
    phones.save(phoneObject, function( err, success){
        console.log("Response success "+success);
        console.log("Response error "+err);
        if(success) {
            console.log("Success saving the phone number "+phoneObject);

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
            res.send(200, success);
            return next();
        } else
        {
            console.log("Error saving the phone number "+phoneObject);
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
