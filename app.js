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

function distance(source, target) {//https://gist.github.com/IceCreamYou/8396172
    if (!source) return target ? target.length : 0;
    else if (!target) return source.length;

    var m = source.length, n = target.length, INF = m+n, score = new Array(m+2), sd = {};
    for (var i = 0; i < m+2; i++) score[i] = new Array(n+2);
    score[0][0] = INF;
    for (var i = 0; i <= m; i++) {
        score[i+1][1] = i;
        score[i+1][0] = INF;
        sd[source[i]] = 0;
    }
    for (var j = 0; j <= n; j++) {
        score[1][j+1] = j;
        score[0][j+1] = INF;
        sd[target[j]] = 0;
    }

    for (var i = 1; i <= m; i++) {
        var DB = 0;
        for (var j = 1; j <= n; j++) {
            var i1 = sd[target[j-1]],
                j1 = DB;
            if (source[i-1] === target[j-1]) {
                score[i+1][j+1] = score[i][j];
                DB = j;
            }
            else {
                score[i+1][j+1] = Math.min(score[i][j], Math.min(score[i+1][j], score[i][j+1])) + 1;
            }
            score[i+1][j+1] = Math.min(score[i+1][j+1], score[i1] ? score[i1][j1] + (i-i1-1) + 1 + (j-j1-1) : Infinity);
        }
        sd[source[i-1]] = i;
    }
    return score[m+1][n+1];
}

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
    
    if(cards.hasOwnProperty(searchstring))
        return [searchstring,cards[searchstring]];
    let bestMatch = ["",1000];
    for(let name in cards)
    {
        let i = distance(name,searchstring);
        if(i<bestMatch[1])
            bestMatch=[name,i];
    }
    return [bestMatch[0],cards[bestMatch[0]]];
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