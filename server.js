var config = require("./config");
var Imap = require("imap"),
inspect = require('util').inspect,
MailParser = require("mailparser").MailParser,
mailParser = new MailParser(),
nodemailer = require("nodemailer"),
email = config.username,
password = config.password;


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
    console.log(email);

    var _text = email.from[0].name.split(" ")[0] + ",\nBugger off.\nI'm not done.\n\nRoboSeth"
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