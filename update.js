const http = require("http");
const fs = require("fs");

function download(name, dest, cb) {
    let file = fs.createWriteStream(dest);
    let request = http.get({host:"mtgjson.com",path:"/json/"+name+".json",timeout:2*60*1000}, 
        function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(cb);  // close() is async, call cb after close completes.
                });
        }
    ).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        console.log(err.message);
        }
    );
};

var cards = {};
var sets = {};
var legal = require("./legalities.json");
console.log("Downloading file, this might take a while.");
download("AllSetsArray","ASA.json",downloadComplete());


function downloadComplete()
{
    
        try{
            sets = require("./ASA.json");
        }
        catch(e){
            console.log(e)
            console.log("Something went wrong with AllSetsArray.json. Redownloading.");
//            download("AllSetsArray","ASA.json",downloadComplete);
            return;
        }

        reduceFile();
        sets = null;//free memory (about 400MB)
        console.log("Deleting tempory file");
        fs.unlink("ASA.json");//delete the file.
        console.log("Saving cards array.");
        fs.writeFile("./data/cards.json",JSON.stringify(cards));
        console.log("Updating version number");
        download("version-full","./data/version.json",null);
        console.log("Update complete!");
}


function reduceFile(){
    console.log("Reducing file...")
    for(let set_name in sets)
    {
        let set = sets[set_name];
        let setcode = set.code;
        if(
            legal.sets.includes(setcode)
            ||
            ( 
                setcode.startsWith("DD") 
                &&
                legal.dueldecks.includes(setcode.charAt(2))
            )
          )
        {
            for(let card in set.cards)
            {
                name = set.cards[card].name;
                if(set.cards[card].types.includes("Plane"))
                    setCard(name,10);
                else
                if(set.cards[card].types.includes("Phenomenon"))
                    setCard(name,11);
                else
                if(set.cards[card].types.includes("Vanguard"))
                    setCard(name,12);
                else
                if(set.cards[card].types.includes("Scheme"))
                    setCard(name,13);
                else
                if(set.cards[card].types.includes("Conspiracy"))
                    setCard(name,14);
                else
                if(legal.banned.includes(name))
                    setCard(name,2);//banned
                else
                if( (legal.restricted.includes(name)  || legal.kitbashrestricted.includes(name) ) && ! legal.kitbashunrestricted.includes(name))
                    setCard(name,1);//restricted
                else
                    setCard(name,0);//legal!
            }
        }
        else
        {
            for(let card in set.cards)
            {
                let temp = set.cards[card].name;
                let temp2 = set.name;
                addIllegalCard(set.cards[card].name);
            }
        }
    }
    console.log("Done!");
}

function addIllegalCard(name){
    if(cards.hasOwnProperty(name.toLowerCase()) == false)
        setCard(name,3);
}
    
function setCard(name,legality)
{
    cards[name.toLowerCase()] = legality;
}
