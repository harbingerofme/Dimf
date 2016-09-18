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
        reloadData();
        console.log("\tData is up to date!");
        return;
    }
    console.log("\tData is outdated.");
}
function reloadData()
{
    cards = asociativeArrayToNormal(require("./data/AllCards-x.json"));    
    version = require("./data/version.json");
    sets = require("./data/AllSetsArray-x.json");
}

function asociativeArrayToNormal(input)
{
    var temp =[];
    for(var a in input)
    {
        temp.push(input[a]);
    }
    return temp;
}

var version = {};
var cards = {};
var sets  = {};
var servers;
try{
    servers = require("./data/servers.json");
}catch(e){
    servers = {};
}
var date = new Date();
console.log(`${date.getDate()}/${(date.getMonth()<10)? "0"+date.getMonth() : date.getMonth()} ${(date.getHours()<10) ? "0"+date.getHours() : date.getHours()}:${(date.getMinutes()<10)? "0"+date.getMinutes() : date.getMinutes()} checking database version.`);
try{
    version = require("./data/version.json");
    download("http://mtgjson.com/json/version-full.json","./data/version-new.json",checkVersion);
}catch(e){
    console.log("\tNo version.json found, please provide the following files from mtgjson.com:\n\t\t./data/AllCards-x.json\n\t\t./data/version.json\n\t\t./data/AllSetsArray-x.json");
}

const Client = new Discord.Client();

function saveData(){
    var jsonString = JSON.stringify(servers);
    var date = new Date();
    fs.writeFile("./data/servers.json",jsonString,(e)=>{console.log(`${date.getDate()}/${(date.getMonth()<10)? "0"+date.getMonth() : date.getMonth()} ${date.getHours()}:${date.getMinutes()} saved data.`);});
}

function assertServerData(id, save){
    if(servers[id] == undefined){
        servers[id] = {encircling: "[]",enimaging: "{}", search: ""};
        if(save)
            saveData();
    }
}
function assertServerDataS(id){assertServerData(id,true);}//overload.

var userFoundCardslist = {};

function search(searchstring, authorId)
{
    if(searchstring.split(" ").length==1 && !isNaN(searchstring) && userFoundCardslist.hasOwnProperty(authorId) && Math.abs(searchstring)<userFoundCardslist[authorId].cards.length){
        return userFoundCardslist[authorId].cards[Math.abs(searchstring)];
    }

    var output = cards.find((x)=>{return x.name.toLowerCase()==searchstring && x.type!="token" && x.layout!="vanguard"});
    if(output != undefined)
        return output;
    else{
        var output = cards.filter((x)=> {
                return x.name.toLowerCase().indexOf(searchstring.toLowerCase())!=-1 && x.type!="token" && x.layout!="vanguard";
        });
    }
    if(output.length>1){
        output.sort((x,y)=>{
            if(x.printings.length>y.printings.length+5)
                return -1;
            if(y.printings.length>x.printings.length+5 || x.name>y.name)
                return 1;
            return -1;
        });
        return output;
    }
    if(output.length==1)
        return output[0];    
    return false;
}

function handleSearch(searchResult, authorId, singletonCallback, multipleCallback, nothingCallback)
{
    if(searchResult.hasOwnProperty("name"))
        return singletonCallback(searchResult);
    else
        if(searchResult !=  false)
            return multipleCallback(searchResult, authorId);
        else
            return nothingCallback(searchResult);
}

function oracleMessage(card){
    output = `**__${card.name}__**, ${card.type}`;
    if(card.hasOwnProperty("manaCost"))
        output+= " "+card.manaCost//no mana cost? Don't care
    output +="\n"
    if(card.hasOwnProperty("names"))
        output+= `*(part of a ${card.layout} card, all names: "${card.names.join("//")}")*\n` 
    if(card.text!="")
        output+="```\n"+card.text+"```\n";
    if(card.hasOwnProperty("power"))
        output+=`Power/Toughness: **${card.power.replace("*","★")}**/**${card.toughness.replace("*","★")}**\n`;
    if(card.hasOwnProperty("loyalty"))
        output+="Starting loyalty: "+card.loyalty+"\n";
    if(card.layout == "vanguard")
        output+= `Modifiers: hand: ${card.hand}, life: ${card.life}`;
    if(card.legalities.length>0){
        output+="Legality: ";
        var temp = legality(card);
        for(var a= 0;a<temp.length;a++){
            output+= `${(a==0)?"":", "}${temp[a].format}${temp[a].legality}`;
        }
    }
    return output;
}

function legality(card){
    var legal = card.legalities;
    legal.sort((x,y) => {
        if(x.legality=="Legal") return -1;
        if(y.legality=="Legal") return 1;
        if(x.legality=="Restricted") return -1;
        if(y.legaltity=="Restricted") return 1;
        if(x.legality=="Banned") return 1;
        return 1;
    });
    legal.sort((x,y) => {
        if(x.legality==y.legality)
            return (x.format<y.format)?-1:1;
        return 0;
    });
    legal.forEach(function(element) {
        switch(element.format){
            case "Legacy":element.format = "leg";break;
            case "Vintage":element.format= "vin";break;
            case "Commander":element.format = "cmd";break;
            case "Modern":element.format = "mod";break;
            case "Standard":element.format = "std"; break;
            default: if(element.format.indexOf("Block")!=-1)
                        element.format = "BlckConstr";
                     else
                        element,format = element.format.substr(0,3);
                break;
        }
        switch(element.legality){
            case "Legal":element.legality = "";break;
            case "Banned": element.legality = "BAN";break;
            case "Restricted": element.legality = "Res";break;
        }
    });
    return legal;
}

function multipleCardsMessage(cards,userid)
{
    output = "Found multiple cards: \n";
    output+= "```";
    for(var a =0; a<cards.length;a++)
    {
        if(a!=0)
            output += "; ";
        output+=cards[a].name+` (${a})`;
    }
    output+="```";
    var timeout = (new Date().getTime()/1000/60)+5;
    userFoundCardslist[userid] = {timeout: timeout , cards: cards};
    return output;
}

function imageFromCard(card)
{
    var imageURL ="";
    for(var a=card.printings.length-1;a>-1;a--){
        var set = sets.find((x) => {return x.code == card.printings[a];});
        if(set != undefined){
            var setCard = set.cards.find((x) => {return x.name == card.name;});
            if(set.hasOwnProperty("magicCardsInfoCode")){
                if(setCard != undefined){
                    if(setCard.hasOwnProperty("mciNumber")){
                        imageURL = `http://magiccards.info/scans/en/${set.magicCardsInfoCode}/${setCard.mciNumber}.jpg`;
                        break;
                    }else{
                        imageURL = `http://magiccards.info/scans/en/${set.magicCardsInfoCode}/${setCard.number}.jpg`;
                    }
                }
            }else{
                if(setCard != undefined){
                    if(setCard.hasOwnProperty("mciNumber")){
                        imageURL = `http://magiccards.info/scans/en/${set.code.toLowerCase()}/${setCard.mciNumber}.jpg`;
                        break;
                    }else{
                        imageURL = `http://magiccards.info/scans/en/${set.code.toLowerCase()}/${setCard.number}.jpg`;
                    }
                }    
            }
        } 
    }
    if(imageURL == "")
        imageURL = "No printings found on magiccards.info."
    return imageURL;
}

function multipleLinks(cards, authorId)
{
    output = "Multiple cards found:";
    for(var a =0; a<cards.length;a++)
    {
        output += "\n";
        var uri = imageFromCard(cards[a]);
        if(uri.startsWith("http"))
            uri = "<"+uri+">";
        output+=`*${cards[a].name}*: ${uri} (${a})`;
    }
    output+="\nFor an embedded version, try \"image <nr>\" *(omit the \\`<>\\`)* ";
    var timeout = (new Date().getTime()/1000/60)+5;
    userFoundCardslist[authorId] = {timeout: timeout , cards: cards};
    return output;
}

function rulingMessage(card)
{
    output = `**__${card.name}__**\n`;
    if(card.hasOwnProperty("rulings") && card.rulings.length>0){
        for(var a = 0; a<card.rulings.length; a++)
            output+=`**${card.rulings[a].date}**: ${card.rulings[a].text}\n`;
    }else
        output+="No rulings, play card as written.";
    return output;
}

function updateList()
{
    var time = new Date().getTime()/1000/60;
    for(var a in userFoundCardslist){
        if(userFoundCardslist[a].timeout < time)
            delete userFoundCardslist[a];
    }
}

Client.on("message", (msg) => {
    updateList();
    if(msg.guild != undefined && msg.guild != null){
    try{
        if(msg.content.startsWith(`<@${Client.user.id}> `) || (servers[msg.guild.id].search!= "" && msg.content.startsWith(servers[msg.guild.id].search)))
            {
                var defaultFailText = "I found no cards like that!";
                var result;
                var stuff = msg.content.replace(`<@${Client.user.id}> `,"");
                stuff = stuff.replace(servers[msg.guild.id].search,"");
                var splits = stuff.split(" ");
                var cbs = {scb : (x)=>{},mcb : (x)=>{},fcb: (x) => {return defaultFailText;}};
                var def = false;
                switch(splits.shift())
                {
                    case "image":
                        cbs.scb = imageFromCard;
                        cbs.mcb = multipleLinks;
                    break;
                    default://walks into oracle
                        def = true;
                    case "oracle":
                        cbs.scb = oracleMessage;
                        cbs.mcb = multipleCardsMessage;
                    break;
                    case "rulings":
                        cbs.scb = rulingMessage;
                        cbs.mcb = multipleCardsMessage;
                    break;
                }
                if(!def)
                    stuff = splits.join(" ");
                result = search(stuff,msg.author.id);
                var output = handleSearch(result,msg.author.id,cbs.scb,cbs.mcb,cbs.fcb)
                msg.channel.sendMessage((output.length>1950)?`I found too many cards (${result.length}), please narrow down your search!`:output );
            }
        //do regex matching for encircling, then give oracle text for card(s), by more than 3 cards, only give card names.
        //do regex matching for enimaging, then attach card if able, if multiple, try to do a mc.info link?
    }catch(e){
        console.log(e);
        assertServerDataS(msg.guild.id)
    }}else{//private message
        //check if it has start modifier "oracle" (or "image", but ignore it)
        //try and search it, if true, give image or names if multiple
        //assume it's a card, so give image
    }
})

Client.on("ready", (x) => {console.log("Ready!")})


Client.login(config.token);