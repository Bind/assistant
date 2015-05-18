var config = require("./config.js");
var Imap = require("imap"),
util = require("util"),
inspect = require('util').inspect,
MailParser = require("mailparser").MailParser,
mailParser = new MailParser(),
nodemailer = require("nodemailer"),
async = require("async");

email = config.username || process.env.username;
password = config.password ||process.env.password;

var apikey = config.mailchimp_api || process.env.m_api;
var MC_FINTECH_LIVE=config.list_id || process.env.list_id;

var MailChimpAPI = require('mailchimp').MailChimpAPI
var api;
    try {
         api = new MailChimpAPI(apikey, {
            version: '2.0'
        });
    } catch (error) {
        //console.log(error.message);
    }

var authorized_emails = [
    "brooks@fintech.io",
    "gareth@fintech.io",
    "travis@fintech.io",
    "doug@fintech.io"
]




/* EMAIL TRANSPORTER */
var responder = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: config.username,
        pass: config.password
    }
})

/* EMAIL SERVER ACCESS */
var imap = new Imap({
  user: config.username,
  password: config.password,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
});


function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}


/* PARSES RAW TEXT EMAILS TO JSON */
mailParser.on("end", function(email){
    //console.log(email);
    var admin = email.from[0];
    console.log("=====================================");
    //console.log(email);

    var _text = "";

    if (authorized_emails.indexOf(admin.address.toLowerCase()) > -1){
       // console.log("AUTHORAIZED USER")
    var _subscribers = email.to.map(function(curr){
        return {address: curr["address"],
                name: curr["name"]
                }
    })
 
    async.each(_subscribers, function(sub, callback){
        var _sub = sub;
        //console.log(sub)
        api.call("lists", "subscribe", {
                apikey:apikey,
                id: MC_FINTECH_LIVE,
                double_optin: false,
                send_welcome:true,
                email: {email: sub.address,
                merge_vars:{
                    NAME: sub["name"],
                    NEWS: "Weekly Round Up" 
                }
            }}, function(err){
                //console.log(_text)
                if (err) {
                    console.log(err);
                    var _t = ""
                    if (sub.name) {_t = _sub.name + ' ' +  err.message}
                            else {_t = _sub.address + ' ' + err.message}
                    _text += _t
                    //console.log("TEXT:" +_text);
                    callback(err);
                    }else{
                        var _t; 
                        if (sub.name) {_t = _sub.name + " was added to the FinTech Live Mailinglist\n"}
                            else{_t = _sub.address + " was added to the FinTech Live Mailinglist\n"}
                        //console.log(_sub.name)
                        _text += _t;
                       // console.log("TEXT:" +_text)
                callback();
                }
            }); 
                },function(err){
                    if (err){ 
                        console.log(err);
                        }

       // console.log(_text);
        
        responder.sendMail({
            subject:email.subject,
            from: config.username,
            to: email.from[0].address,
            inReplyTo:email.messageId,
            references:[email.messageId],
            text: _text

        }, function(err, data){
            if (err) console.log(err);
            //console.log(data);    
        })





                    });
                }
                

})


imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
        imap.on("mail", function(numOfNewMessages){
            var f = imap.seq.fetch('*',{
                markSeen: true,
                bodies: '',
                modifiers:'!Seen', 
                struct: true
            });
            f.on('message', function(msg, seqno){
                msg.on('body', function(stream, info){
                stream.pipe(mailParser);
                });


            })

        });


  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();