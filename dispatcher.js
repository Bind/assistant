var EE = require("events").EventEmitter,
    async = require("async");

var config = require("./config.js");

var MC_FINTECH_LIVE=config.list_id || process.env.list_id;
var MailChimpAPI = require('mailchimp').MailChimpAPI
var apikey = config.mailchimp_api || process.env.m_api;

var dispatcher = new EE()

var authorized_emails = [
    "brooks@fintech.io",
    "gareth@fintech.io",
    "travis@fintech.io",
    "doug@fintech.io"
]
var _u = config.username;
var api;
    try {
         api = new MailChimpAPI(apikey, {
            version: '2.0'
        });
    } catch (error) {
        //console.log(error.message);
    }


dispatcher.on("newEmail", function(email, responder){
    console.log(email);

    var _admin = email.from[0];
    if (authorized_emails.indexOf(_admin.address.toLowerCase()) > -1){
       // console.log("AUTHORAIZED USER")
    

    if(email.to){
        if (email.to.some(function(curr){return curr.address === _u})){
            dispatcher.emit('directAdd', email, responder)};
    }

    if (email.cc){
        if (email.cc.some(function(curr){ return curr.address === _u})){
            dispatcher.emit('CC', email, responder)};
    }

    } else {
        dispatcher.emit("unathorized");
    }


})

dispatcher.on('directAdd', function(email, responder){
    var _subscribers = email.text.split("\n").map(function(curr){
            return {
                 name: curr.split(' ').splice(-1, 1).join(' '),
                 address: curr.split(' ').slice(-1).join(' ')
            }}).filter(function(curr){
                return curr.name !== '' && curr.address !== '' /*cleans empty lines*/
                });
            dispatcher.emit("addSubscribers", email, responder, _subscribers);
})



dispatcher.on("addSubscribers", function(email, responder, subscribers){
    var _text = "";
    async.each(subscribers, function(sub, callback){
        var _sub = sub;
        //console.log(sub)
        api.call("lists", "subscribe", {
                apikey:apikey,
                id: MC_FINTECH_LIVE,
                double_optin: false,
                send_welcome:true,
                email: sub.address,
                merge_vars:{
                    NAME: sub["name"],
                    NEWS: "Weekly Round Up" 
                }
            }, function(err){
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
            from: _u,
            to: email.from[0].address,
            inReplyTo:email.messageId,
            references:[email.messageId],
            text: _text

        }, function(err, data){
            if (err) console.log(err);
            //console.log(data);    
        })
    });/*END CC'ed on an email chain*/


})



dispatcher.on('CC', function(email, responder){


    var _subscribers = email.to.map(function(curr){
        return {address: curr["address"],
                name: curr["name"]
                }
    })

    dispatcher.emit("addSubscribers", email, responder, _subscribers)

    /* CC'ed on an email chain
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
            to: _u,
            inReplyTo:email.messageId,
            references:[email.messageId],
            text: _text

        }, function(err, data){
            if (err) console.log(err);
            //console.log(data);    
        })
    });END CC'ed on an email chain*/

})

dispatcher.on('response', function(){})
dispatcher.on("unauthorized", function(){})

module.exports  = dispatcher;