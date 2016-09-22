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

function oracleMessage(card)
{
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
    if(card.hasOwnProperty("legalities") && card.legalities.length>0){
        output+="Legality: ";
        var temp = legality(card);
        for(var a= 0;a<temp.length;a++){
            output+= `${(a==0)?"":", "}${temp[a].format}${temp[a].legality}`;
        }
    }
    return output;
}

function legality(card)
{
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
    output+="\nFor an embedded version, try \"<nr>\" *(omit the \\`<>\\`)* ";
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

function getHelp(stuff, msg)
{
    let output = "Full documentaion, source code and invite link available on http://github.com/harbingerofme/Dimf/\n";
    output += "By default, I ignore all messages on a server, except the ones who start with a mention to me.\n";
    output += "People with the 'Manage Server' permission can change this to allow a prefix. (for example '!')\n";
    output += "\n";
    output += "Then I look at the first word (so space after mention, or **directly** after prefix) and do one of the following things:\n"
    output += "**image** (or nothing): I post a mci link to the most recent printing of the image.\n"
    output += "**oracle**: I wil post the oracle text of a card, and it's legalites in different formats\n";
    output += "**rulings**: I will post rulings of a card, if any.\n";
    output += "\t*If any of the above modes returns multiple cards, I will try to give you a list of them.\n";
    output += "\tYou can then just use the number listed besides the card name, in any of the above modes (for example 'oracle 1' would give you the oracle text of the card with a (1) next to it.)*\n"
    output += "**help**: I'll pm you this.\n";
    output += "**settings**: My developer is working hard on this!\n";
    msg.author.sendMessage(output);
    if(msg.channel.guild != null)
        return "Help has been dm'd to you!";
    return "";
}

function settingsHandler(stuff, msg)
{

}

function updateList()
{
    var time = new Date().getTime()/1000/60;
    for(var a in userFoundCardslist){
        if(userFoundCardslist[a].timeout < time)
            delete userFoundCardslist[a];
    }
}

function handleInput(stuff,msg)
{
    let defaultFailText = "I found no cards like that!";
    let result;
    
    let splits = stuff.split(" ");
    let cbs = {scb : (x)=>{},mcb : (x)=>{},fcb: (x) => {return defaultFailText;}};
    let def = false, doSearch =  true;
    switch(splits.shift().toLowerCase())
    {
        case "help":
            if(splits.length == 0)//there's plenty of cards named help <x> or something.'
            {
                doSearch = false;
                cbs.scb = getHelp;
                break;
            }
        default://walks into image
            def = true;
        case "image":
            cbs.scb = imageFromCard;
            cbs.mcb = multipleLinks;
        break;
        case "oracle":
            cbs.scb = oracleMessage;
            cbs.mcb = multipleCardsMessage;
        break;
        case "rulings":
            cbs.scb = rulingMessage;
            cbs.mcb = multipleCardsMessage;
        break;
        
        case "settings": 
            doSearch = false;
            cbs.scb = settingsHandler;
        break;
    }
    if(!def)
        stuff = splits.join(" ");
    let output ="";
    if(doSearch)
    {
        result = search(stuff,msg.author.id);
        output = handleSearch(result,msg.author.id,cbs.scb,cbs.mcb,cbs.fcb);
    }else{
        result = false;
        output = cbs.scb(stuff,msg);
    }
    return [output,result];
}

Client.on("message", (msg) => {
    if(msg.author.id != Client.user.id){
        updateList();
        if(msg.guild != undefined && msg.guild != null){
        try{
            if(msg.content.startsWith(`<@${Client.user.id}> `) || msg.content.startsWith(`<@!${Client.user.id}> `) || (servers[msg.guild.id].search!= "" && msg.content.startsWith(servers[msg.guild.id].search)))
                {
                    let stuff = msg.content.replace(`<@${Client.user.id}> `,"");
                    stuff = msg.content.replace(`<@!${Client.user.id}> `,"");
                    stuff = stuff.replace(servers[msg.guild.id].search,"");               
                    let output = handleInput(stuff,msg);
                    msg.channel.sendMessage((output[0].length>1950)?`I found too many cards (${output[1].length}), please narrow down your search!`:output[0] );
                }
            //do regex matching for encircling, then give oracle text for card(s), by more than 3 cards, only give card names.
            //do regex matching for enimaging, then attach card if able, if multiple, try to do a mc.info link?
        }catch(e){
            console.log(e);
            assertServerDataS(msg.guild.id)
        }}else{//private message
            let output = handleInput(msg.content,msg);
            msg.channel.sendMessage((output[0].length>1950)?`I found too many cards (${output[1].length}), please narrow down your search!`:output[0] );
        }
    }
})

Client.on("ready", (x) => {console.log("Ready!")})


Client.login(config.token);