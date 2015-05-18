var config = require("./config.js");
var Imap = require("imap"),
    util = require("util"),
    inspect = require('util').inspect,
    MailParser = require("mailparser").MailParser,
    mailParser = new MailParser(),
    nodemailer = require("nodemailer"),
    dispatcher = require("./dispatcher");


email = config.username || process.env.username;
password = config.password ||process.env.password;



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
    console.log("=====================================");
    dispatcher.emit("newEmail", email, responder);
    //console.log(email);

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