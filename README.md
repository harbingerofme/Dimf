# Dimf
An open source MtG oracle and image fetcher for [discord](https://discordapp.com).

Nothing spectacular, but it does it's job fine.

## For users:

Whenever a message is received, this happens:

  * By default, the bot ignores all messages on a server, except the ones who start with a mention to it.
     * People with the 'Manage Server' permission will be able to change this to allow a prefix. (for example '!')
  * Messages handled are in the following one of the two following formats:
    * `@mention <mode> <(partial) card name>`
    * `<prefix><mode> <(partial) card name>`
      * If the card name matches exactly, or there's only one match for that name, the bot will return that card
      * If it matches multiple cards, the bot will try to give you a list of them.
        * You can then just use the number listed besides the card name, in any of the searching modes. _(For example, 'oracle 1' would give you the oracle text of the card with a (1) next to it.)_
    * Note that only searching modes require a card name.
  * Then the bot looks at the first word to determine the mode (so a space after mention, or **directly** after prefix):
    * Searching modes:
      * **image** (or nothing): the bot posts a magicccards.info link to the most recent printing of the card.
      * **oracle**: the bot posts the oracle text of a card, and it's legalites in different formats.
        * If a format is not in the list, it's not legal because it never has been pritned in a set that is legal for that format.
      * **rulings**: The bot posts rulings of the card, if any.
    * Meta modes:  
      * **help**: The bot will pm you a near copy of this checklist.
      * **settings**: I'm working hard on making this do something.

## For server managers:

Invite the bot to your server by clicking [this link](https://discordapp.com/oauth2/authorize?client_id=191891486860771328&scope=bot&permissions=0).

Raw: `https://discordapp.com/oauth2/authorize?client_id=191891486860771328&scope=bot&permissions=0`

I'm working on making a customizable prefix available. Stay tuned for that.

## For people who want to host their own version:

To setup the bot, do the following things:
  1. install [git] (https://git-scm.com/downloads), do `git clone https://github.com/harbingerofme/Dimf/ ` OR just download all files in this repo yourself.
  2. install [node v6](https://nodejs.org/).
  3. get the v9 version of discordjs module for node by using `npm i --save hydrabolt/discord.js#indev` in your project folder.
  4. Rename the `config/config.json.example` to `config.json` and edit it with your token. [find your token here](https://discordapp.com/developers/applications/me)
  5. Download the following files  from [mtgjson.com](https://mtgjson.com) and place them in the data folder:
    * [version-full.json](https://mtgjson.com/json/version-full.json) and rename it to `version.json`
    * [allSetsArray-x.json](https://mtgjson.com/json/allSetsArray-x.json)
    * [AllCards-x.json](https://mtgjson.com/json/AllCards-x.json)
  6. Run the bot with `node app` while in the root of the project folder.
  7. Invite it to your server with `https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot` where `YOUR_CLIENT_ID` is the client id found on your application page.

You can update the bot with `git pull` if you cloned it.

Feel free to reuse anything from this project, but I'd appreciate it if you linked me what you do with it!
