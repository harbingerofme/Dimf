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
    var date = new Date();
    console.log(`${date.getDate()}/${(date.getMonth()<10)? "0"+date.getMonth() : date.getMonth()} ${(date.getHours()<10) ? "0"+date.getHours() : date.getHours()}:${(date.getMinutes()<10)? "0"+date.getMinutes() : date.getMinutes()} checking database version.`);
    var temp = require("./data/version.json");
    if(temp.version == version.version){
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
    sets = asociativeArrayToNormal(require("./data/AllSetsArray-x.json"));
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
try{
    version = require("./data/version.json");
    download("http://mtgjson.com/json/version-full.json","./data/version.json",checkVersion);
}catch(e){
    console.log("No version.json found, please provide the following files:\n\t./data/AllCards-x.json\n\t./data/version.json\n\t./data/AllSetsArray-x.json");
}

const Client = new Discord.Client();

function saveData(){
    var jsonString = JSON.stringify(servers);
    var date = new Date();
    fs.writeFile("./data/servers.json",jsonString,(e)=>{console.log(`${date.getMonth()}/${date.getDate()} ${date.getHours()}:${date.getMinutes()} saved data.`);});
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

function search(searchstring)
{
    var output = cards.find((x)=>{return x.name.toLowerCase()==searchstring && x.type!="token"});
    if(output != undefined)
        return output;
    else{
        var output = cards.filter((x)=> {
                return x.name.toLowerCase().indexOf(searchstring.toLowerCase())!=-1 && x.type!="token";
        });
    }
    if(output.length>1)
        return output;
    if(output.length==1)
        return output[0];    
    return false;
}

function oracleMessage(card){
    output = `**__${card.name}__**, ${card.type}`;
    if(card.hasOwnProperty("manaCost"))
        output+= " "+card.manaCost//no mana cost? Don't care
    output +="\n"
    if(card.hasOwnProperty("names"))
        output+= `*(part of a ${card.layout} card, all names: "${card.names.join("//")}")*\n` 
    if(card.text!="")
        output+="```"+card.text+"```\n";
    if(card.hasOwnProperty("power"))
        output+=`Power\\Toughness: \`${card.power.toString()}\\${card.toughness.toString()}\`\n`
    if(card.hasOwnProperty("loyalty"))
        output+="Starting loyalty: "+card.loyalty+"\n";
    if(card.layout == "vanguard")
        output+= `Modifiers: hand: ${card.hand}, life: ${card.life}`;
    //output+="Sets: "+card.printings.join(", ");
    return output;
}

function multipleCardsMessage(cards,userid)
{
    output = "Found multiple cards: \n";
    cards.sort((x,y)=>{return y.printings.length-x.printings.length});
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
        if(msg.content.startsWith(`<@${Client.user.id}> `) || (servers[msg.guild].search!= "" && msg.content.startsWith(servers[msg.guild].search)))
            {
                var result;
                var stuff = msg.content.replace(`<@${Client.user.id}> `,"");
                stuff = stuff.replace(servers[msg.guild].search,"");
                if(stuff.split(" ").length==1 && !isNaN(stuff) )
                    try{result = userFoundCardslist[msg.author.id].cards[stuff]}
                    catch(e){
                        result =false;
                    }
                else
                    result = search(stuff);
                if(result){
                    if(result.hasOwnProperty("name"))
                        msg.channel.sendMessage(oracleMessage(result));
                    else
                        msg.channel.sendMessage(multipleCardsMessage(result,msg.author.id));
                }
                else
                    msg.channel.sendMessage("I found no cards like that!");
            }
        //do regex matching for encircling, then give oracle text for card(s), by more than 3 cards, only give card names.
        //do regex matching for enimaging, then attach card if able, if multiple, try to do a mc.info link?
    }catch(e){
        console.log(e);
    }}else{//private message
        //check if it has start modifier "oracle" (or "image", but ignore it)
        //try and search it, if true, give image or names if multiple
        //assume it's a card, so give image
    }

})


Client.login(config.token);