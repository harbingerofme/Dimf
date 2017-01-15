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
    version = require("./data/version.json");
}


var version = {};
var cards = {};
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
    console.log("\tNo version.json found, please run update.js");
}

const Client = new Discord.Client();

function saveData(){
    var jsonString = JSON.stringify(servers);
    var date = new Date();
    fs.writeFile("./data/servers.json",jsonString,(e)=>{console.log(`${date.getDate()}/${(date.getMonth()<10)? "0"+date.getMonth() : date.getMonth()} ${date.getHours()}:${date.getMinutes()} saved data.`);});
}

function assertServerData(id, save = true){
    if(servers[id] == undefined){
        servers[id] = {encircling: "[]",enimaging: "{}", search: ""};
        if(save)
            saveData();
    }
}

var userFoundCardslist = {};

function search(searchstring, authorId)
{
    if(searchstring.split(" ").length==1 && !isNaN(searchstring) && userFoundCardslist.hasOwnProperty(authorId) && Math.abs(searchstring)<userFoundCardslist[authorId].cards.length){
        return userFoundCardslist[authorId].cards[Math.abs(searchstring)];
    }

    var output = cards.find((x)=>{return x.name.toLowerCase()==searchstring.toLowerCase() && x.type!="token" && x.layout!="vanguard"});
    if(output != undefined)
        return output;
    else{
        var output = cards.filter((x)=> {
                return x.name.toLowerCase().indexOf(searchstring.toLowerCase())!=-1 && x.type!="token" && x.layout!="vanguard";
        });
    }
    if(output.length>1){
        output.sort((x,y)=>{
            if(x.hasOwnProperty("mci") && y.hasOwnProperty("mci")){
                if(x.mci.length>y.mci.length+5)
                    return -1;
                if(y.mci.length>x.mci.length+5 || x.name>y.name)
                    return 1;
                return -1;
            }else{
                if(x.hasOwnProperty("mci"))
                    return -1;
                if(y.hasOwnProperty("mci")||x.name>y.name)
                    return 1;
                return -1;
            }
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
    if(card.hasOwnProperty("mci")){
        for(var a=0;a<card.mci.length;a++){
            imageURL = `http://magiccards.info/scans/en/${card.mci[a].setcode}/${card.mci[a].number}.jpg`;
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
    let output = "Full documentation, source code and invite link available on http://github.com/harbingerofme/Dimf/\n";
    output += "By default, I ignore all messages on a server, except the ones who start with a mention to me.\n";
   // output += "People with the 'Manage Server' permission can change this to allow a prefix. (for example '!')\n";
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

        case "eval":
            if(msg.author.id == "98460699696574464"){
                doSearch = false;
                try{
                    console.log("EVAL: "+ eval(splits.join(" ")));
                    cbs.scb = function(x,y){return "Eval executed.";};
                }
                catch(e)
                {
                    cbs.scb = function(x,y){return "Eval failed: "+e;};
                }
            }
            else
            {
                def = true;
                cbs.scb = imageFromCard;
                cbs.mcb = multipleLinks;
            }
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
                        console.log(`${msg.guild}:${msg.author.username}#${msg.author.discriminator}:${stuff}`);
                        stuff = stuff.replace(`<@!${Client.user.id}> `,"");
                        stuff = stuff.replace(servers[msg.guild.id].search,"");               
                        let output = handleInput(stuff,msg);
                        msg.channel.sendMessage((output[0].length>1950)?`I found too many cards (${output[1].length}), please narrow down your search!`:output[0] );
                    }
                //do regex matching for encircling, then give oracle text for card(s), by more than 3 cards, only give card names.
                //do regex matching for enimaging, then attach card if able, if multiple, try to do a mc.info link?
            }catch(e){
                console.log(e);
                assertServerData(msg.guild.id)
            }
        }else{//private message
            console.log(`PRIVATE:${msg.author.username}#${msg.author.discriminator}:${msg.content}`)
            let output = handleInput(msg.content,msg);
            msg.channel.sendMessage((output[0].length>1950)?`I found too many cards (${output[1].length}), please narrow down your search!`:output[0] );
        }
    }
})

Client.on("ready", (x) => {console.log("Ready as "+Client.user.username);Client.user.setGame("Try DM'ing me or \"help\"!")})


Client.login(config.token);