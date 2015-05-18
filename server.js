var config = require("./config.js");
var Imap = require("imap"),
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
    var admin = email.from[0];
    var _text = ""
    if (authorized_emails.indexOf(admin.address.toLowerCase()) > -1){


    console.log(email);
    var _subscribers = email.to.map(function(curr){
        return {address: curr["address"],
                name: curr["name"]
                }
    })
    async.each(_subscribers, function(sub, callback){
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
                if (err) {
                    console.log(err);
                    callback(err);
                    }else{
                        _text += sub.name + " was added to the FinTech Live Mailinglist\n"
                callback();
                }
            }); 
                },function(err){
                    if (err){ 
                        console.log(err);
                        console.log("a user was failed to subscribed to mailchimp")
                        }
                    });
                }
            
        
        responder.sendMail({
            subject:email.subject,
            from: config.username,
            to: email.from[0].address,
            inReplyTo:email.messageId,
            references:[email.messageId],
            text: _text,

        }, function(err, data){
            if (err) console.log(err);
            console.log(data);    
        })
})


imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
        imap.on("mail", function(numOfNewMessages){
            console.log("new message");
            console.log(numOfNewMessages);
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