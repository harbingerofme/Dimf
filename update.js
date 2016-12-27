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



function proceedIfBothComplete()
{
    
    downloads++;
    console.log("Downloads: "+downloads*50+"%");
    if(downloads==2)
    {
        console.log("Merging files...");
        try{
            sets = require("./ASAx.json");
        }
        catch(e){
            console.log("Something went wrong with AllSetsArray-x.json. Redownloading.");
            downloads--;
            download("AllSetsArray-x","ASAx.json",proceedIfBothComplete);
            return;
        }
        try{
            cards = require("./ACx.json");
        }
        catch(e){
            console.log("Something went wrong with AllCards-x.json. Redownloading.");
            downloads--;
            download("AllCards-x","ACx.json",proceedIfBothComplete);
        }

        mergeFiles();
        sets = null;//free memory (about 400MB)
        console.log("Deleting tempory file");
        fs.unlink("ASAx.json");//delete the file.
        reduceCardObjectAndConvertToNormalArray();
        console.log("Saving cards array.");
        fs.writeFile("./data/cards.json",JSON.stringify(cards));
        console.log("Deleting temporary file");
        fs.unlink("ACx.json");
        console.log("Updating version number");
        download("version-full","./data/version.json",null);
        console.log("Update complete!");
    }
}

function mergeFiles(){
    console.log("Merging files...")
    for(let set_name in sets)
    {
        let set = sets[set_name];
        if(set.hasOwnProperty("magicCardsInfoCode"))
        {
            mci_set = set["magicCardsInfoCode"];
            for(let card in set.cards)
            {
                updateMCI(set.cards[card].name,mci_set,set.cards[card].mciNumber);
            }
        }
    }
    console.log("Done!");
}

function updateMCI(name,set,mciNumber){
    try{
    if( ! cards[name].hasOwnProperty("mci"))
        cards[name].mci = [];
    cards[name].mci.push({setcode:set,number:mciNumber});
    }
    catch(e){
        console.log(`Error updating MCI: ${name} :: ${set} :: ${mciNumber}`);
    }
} 

function reduceCardObjectAndConvertToNormalArray(){
    console.log("Reducing and transforming cards object.");
    var temp =[];
    for(let a in cards)
    {
        delete cards[a].imageName;
        delete cards[a].printings;//This is contained in "mci" now
        temp.push(cards[a]);
    }
    cards = temp;
    console.log("Done!");
}

console.log("Downloading files, this might take a while.");
var downloads = 0;
console.log("Downloads: "+downloads*50+"%");
download("AllSetsArray-x","ASAx.json",proceedIfBothComplete);
download("AllCards-x","ACx.json",proceedIfBothComplete);
var sets = {};
var cards = {};