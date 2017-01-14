const https = require("https");
const fs = require("fs");
const Discord = require("discord.js");
const bot = new Discord.Client();
const config = require("./config.json");
const discordChannels = [];
var twitchChannels = [{name: "Twtich name Here!", online: false}];
var posted = false;
var json_file;

//poster console log når botten er klar og køre.
bot.on('ready', () => {
    print('Botten er nu klar!')
})
 
//Lille command til admins og mods så de kan skifte intervalet på hvor tit der checkes om per streamer (sekunder)
bot.on("message", (message)=>{
    if(message.author.bot) return;
    if(!message.content.startsWith(config.prefix)) return;
    let command = message.content.split(" ")[0];
    command = command.slice(config.prefix.length);
 
    if(command === "regler"){
        helpchannel = bot.channels.find("name", "velkommen");
        message.reply('Du kan finde regler her ' + helpchannel);
    }else
    if(command === "yt"){
        message.reply('Kjaspers Youtube : '  + "https://www.youtube.com/user/Kagecraft");
        //message.sendMessage('Her er Kjaspers youtube : '  + "https://www.youtube.com/user/Kagecraft");

    }else
    if(command === "twitter"){
        message.reply('Kjaspers Twitter : '  + "https://twitter.com/KjasperGuy");
        //message.sendMessage('Her er Kjaspers twitter : '  + "https://twitter.com/KjasperGuy");

    }else
    if(command === "instagram"){
        message.reply('Kjaspers Instagram : '  + "https://www.instagram.com/kjasperguy/");
        //message.sendMessage('Her er Kjaspers instagram : '  + "https://www.instagram.com/kjasperguy/");

    }else
    if(command === "snap"){
        message.reply('Kjaspers Snapchat : '  + "https://www.snapchat.com/add/perstream");
        //message.sendMessage('Her er Kjaspers snapchat : '  + "https://www.snapchat.com/add/perstream");

    }else
    if(command === "hjemmeside"){
        message.reply('Kjaspers hjemmeside : '  + "https://kjasper.dk/");
        //message.sendMessage('Her er Kjaspers hjemmeside : '  + "https://kjasper.dk/");

    }else
    if(command === "cmd"){
        message.channel.sendMessage("```Markdown" + "\n" +
        "1. !regler" + "\n" +
        "2. !yt" + "\n" +
        "3. !twitter" + "\n" +
        "4. !instagram" + "\n" +
        "5. !snap" + "\n" +
        "```");
        print("sender besked");
        //message.sendMessage('Her er Kjaspers hjemmeside : '  + "https://kjasper.dk/");

    }
    
});

//function der siger velkommen til alle nye personer som joiner serveren.
bot.on("guildMemberAdd", (member) => {
    print(`Ny bruger "${member.user.username}" har joinet "${member.guild.name}"` );
    member.guild.defaultChannel.sendMessage('Velkommen til ' + member.user + '!');
});


function leadingZero(d){
    if(d < 10){
        return "0" + d;
    }else{
        return d;
    }
}

// adds a timestamp before msg/err
function print(msg, err){
    var date = new Date();
    var h = leadingZero(date.getHours());
    var m = leadingZero(date.getMinutes());
    var s = leadingZero(date.getSeconds());

    console.log("[" + h + ":" + m + ":" + s + "]", msg);
    if(err){
        console.log(err);
    }
}

//function som gemme den nye data i file hvis botten genstarter eller stopper.
function exitHandler(opt, err){
    if(err){
        print(err);
    }
    if(opt.save){
        print("Saving channels to " + "./config.json" + " before exiting");
        print(JSON.stringify(config));
        fs.writeFileSync(__dirname + "/config.json", JSON.stringify(config));
        print("done");
    }
    if(opt.exit){
        print("Kjasper Bot stoppet")
        process.exit();
    }
}

process.on("exit", exitHandler.bind(null, {save:true}));
process.on("SIGINT", exitHandler.bind(null, {exit:true}));
process.on("SIGTERM", exitHandler.bind(null, {exit:true}));
process.on("uncaughtException", exitHandler.bind(null, {exit:true}));


function callApi(twitchChannel, callback){
    var opt = {
        host: "api.twitch.tv",
        path: "/kraken/streams/" + twitchChannel.name.trim(),
        headers: {
            "Client-ID": config.twitchClientID,
            Accept: "application/vnd.twitchtv.v3+json"
        }
    };

    https.get(opt, (res)=>{
        var body = "";

        res.on("data", (chunk)=>{
            body += chunk;
        });

        res.on("end", ()=>{
            var json;
            try{
                json = JSON.parse(body);
            }
            catch(err){
                print(err);
                return;
            }
            if(json.status == 404){
                callback(undefined, undefined);
            }else{
                callback(twitchChannel, json);
                json_file = json;
            }
        });

    }).on("error", (err)=>{
        print(err);
    });
}

//function som tager call back fra twitch api og ser på om streamer er live eller ikke.
function apiCallback(twitchChannel, res){
    if(res && !twitchChannel.online && res.stream && !posted){

        try{
            var channel, defaultChannel;
            if(discordChannels.length === 0){
                defaultChannel = bot.channels.find("name", "notifikationer");
            }else if(a >= -1){
                channel = bot.channels.find("name", discordChannels[a]);
            }
            var msg = "@everyone Kjasper" +
                      " streamer lige nu " +
                      res.stream.game + "\n" +
                      res.stream.channel.url;
            if(channel){
                channel.sendMessage(msg).then(
                    print("Besked sendt i kanal '" + channel.name + "': " +
                          msg)
                );
                twitchChannel.online = true;
            }else if(defaultChannel){
                defaultChannel.sendMessage(msg).then(
                    print("Besked sendt o kanal " + defaultChannel.name +
                          "': " + msg)
                );
                posted = true;
                twitchChannel.online = true;
            }
        }
        catch(err){
            print(err);
        }
        posted = true;
    }else if(res.stream === null){
        twitchChannel.online = false;
    }
}
//function som sender et api call til twtich for at se om der er stream igen, based på hvilken stream der er i arrayet.
function tick(){
    for(let i = 0; i < twitchChannels.length; i++){
        for(let a = -1; a < discordChannels.length; a++){
            if(twitchChannels[i]){
                callApi(twitchChannels[i], apiCallback);
            }
        }
    }
}

//Log in med token ID - findes på https://discordapp.com/developers/applications/me
bot.login(config.token).then((token)=>{
    if(config.token){
        print("Logget på med denne token : " + config.token);
        //var file = fs.readFileSync(__dirname + "/config.json", {encoding:"utf-8"});
        //json_file = JSON.parse(file);
        tick();
        // tick once on startup
        setInterval(tick, config.interval);
        bot.user.setGame("bot.kjasper.dk");
    }else{
        print("Fejl i login her : ", err);
        process.exit(1);
    }
});
