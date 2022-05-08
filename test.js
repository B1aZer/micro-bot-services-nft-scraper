const fs = require('fs');
const dateTime = new Date().toLocaleString()

const logger = fs.createWriteStream(`/home/hipi/Sites/GooDee/nft-scraper/logs/${(new Date().toJSON().slice(0,19))}.txt`, {
    flags: 'a'
});
console.log(dateTime)
logger.write(`test\n`)

  
logger.end()