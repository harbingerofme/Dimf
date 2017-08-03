const config = require("./config/config.json");
const Discord = require("discord.js");
const http = require("http");
const fs = require("fs");

function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    console.log(err.message);
  });
};

function checkVersion(cb){
    var temp = require("./data/version-new.json");
    if(temp.version == version.version){
        fs.unlink("./data/version-new.json",(x) => {});
        console.log("\tData is up to date!");
    }else{
        console.log("\tData is outdated. Please run update.js");
    }
    reloadData();
}
function reloadData()
{
    cards = require("./data/cards.json");
    comments = require("./comments.json");    
    version = require("./data/version.json");
}


var version = {};
var comments = {};
var cards = {};
var date = new Date();
console.log(`${date.getDate()}/${(date.getMonth()<10)? "0"+date.getMonth() : date.getMonth()} ${(date.getHours()<10) ? "0"+date.getHours() : date.getHours()}:${(date.getMinutes()<10)? "0"+date.getMinutes() : date.getMinutes()} checking database version.`);
try{
    version = require("./data/version.json");
    download("http://mtgjson.com/json/version-full.json","./data/version-new.json",checkVersion);
}catch(e){
    console.log("\tNo version.json found, please run update.js");
}

const Client = new Discord.Client();


function searchInput(searchstring)
{
    searchstring = searchstring.toLowerCase();
    if(cards.hasOwnProperty(searchstring))
        return [searchstring,cards[searchstring]];
    let bestmatch = [0,-1];
    for(let name in cards.keys)
    {
        let i =0;
        while(i<name.length && i<searchString.length && name[i] == searchString[i])
            i++;
        if(i>bestmatch[0])
            bestmatch=[i,name];
    }
    if(bestmatch[1] === -1)
        return ["",404];
    
    return [bestmatch[1],cards[bestmatch[1]]];
}

function legalityIntoMessage(name,number)
{
    let category = "404"
    switch(number)
    {
        case 404:category="404";        break;
        case 0  :category="legal";      break;
        case 1  :category="restricted"; break;
        case 2  :category="banned";     break;
        case 3  :category="illegal";    break;
        case 10 :category="plane";      break;
        case 11 :category="phenomenon"; break;
        case 12 :category="vanguard";   break;
        case 13 :category="scheme";     break;
        case 14 :category="conspiracy"; break;
    }
    let num = Math.floor(Math.random()*comments[category].length);
    let text = comments[category][num];
    return text.replace("$NAME",name);
}

Client.on("message", (msg) => {
    if(msg.author.id != Client.user.id){
        if(msg.guild != undefined && msg.guild != null){
            try{
                let output = "";
                if(msg.content.startsWith(`<@${Client.user.id}> `) || msg.content.startsWith(`<@!${Client.user.id}> `)) 
                    {
                        let stuff = msg.content.replace(`<@${Client.user.id}> `,"");
                        console.log(`${msg.guild}:${msg.author.username}#${msg.author.discriminator}:${stuff}`);
                        stuff = stuff.replace(`<@!${Client.user.id}> `,"");
                        let legality = searchInput(stuff);
                        output = legalityIntoMessage(legality[0],legality[1]);
                    }
                else 
                {
                    matches = msg.content.match(/\[\[([^\]]+)\]\]/);
                    if(matches !== null)
                    {
                        let legality = searchInput(matches[1]);
                        output = legalityIntoMessage(legality[0],legality[1])
                    }
                }
                if(output != "")
                    msg.channel.sendMessage(output);
            }catch(e){
                console.log(e);
            }
        }else{//private message
            console.log(`PRIVATE:${msg.author.username}#${msg.author.discriminator}:${msg.content}`)
            let legality = searchInput(msg.content,msg);
            output = legalityIntoMessage(legality[0],legality[1]);
            msg.channel.sendMessage(output);
        }
    }
})

Client.on("ready", () => {
    console.log("Ready as "+Client.user.username);
    //Client.user.setGame("Use [[CARDNAME]] to check legality!");
    }
)


Client.login(config.token);