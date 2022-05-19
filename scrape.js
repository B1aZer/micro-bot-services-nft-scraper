require('dotenv').config();
// OPTIMIZE:
// 1. Log in
// 2. Chain proxy https://stackoverflow.com/questions/68930114/bypass-cloudflares-captcha-with-headless-chrome-using-puppeteer-on-heroku

const puppeteer = require('puppeteer-extra')
const fs = require('fs');
const Logger = require('../_utils/logger')
const logger = new Logger('etherscan-minting')

process.env.TZ = 'America/Toronto' 
process.on('unhandledRejection', error => {
    logger.finish();
    throw error;
});

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const randomUseragent = require('random-useragent');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 73.0.3683.75 Safari / 537.36';


const userAgent = randomUseragent.getRandom();
const UA = userAgent || USER_AGENT;
console.log('------------------------------');
console.log((new Date()).toISOString());
console.log('Start');

init();

async function init() {
    console.log(`Lets go!`)
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    //Randomize viewport size
    await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 3000 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1,
        hasTouch: false,
        isLandscape: false,
        isMobile: false,
    });
    await page.setUserAgent(UA);
    await page.setJavaScriptEnabled(true);
    console.log(`Go to page`)
    await page.goto('https://etherscan.io/nfttracker#mint', {
        waitUntil: 'networkidle0',
    })
    //await page.waitForTimeout(10000)
    //await page.waitForSelector('#mytable_mint .hash-tag');
    console.log(`Waiting`)
    await page.waitForTimeout(25000)
    console.log(`Screen`)
    await page.screenshot({ path: 'etherscan.png', fullPage: true })
    //select 100
    console.log(`Select`)
    await page.select('#mytable_mint_length > label > select', '100');
    await page.waitForNetworkIdle()
    console.log(`Scrap`)
    let data = await page.evaluate((sel) => {
        const tds = Array.from(document.querySelectorAll(sel))
        return tds.map(td => td.innerText === 'View NFT' ? `https://etherscan.io/address/${td.innerHTML.split('/')[2]}`: td.innerText)
    }, "#mytable_mint > tbody > tr td");
    console.log(`Scrap other pages`)
    for (let i = 0; i < 9; i++) {
        await page.click('#mytable_mint_wrapper li.paginate_button.page-item.next > a');
        await page.waitForNetworkIdle();
        await page.waitForTimeout(1000)

        let newData = await page.evaluate((sel) => {
            const tds = Array.from(document.querySelectorAll(sel))
            return tds.map(td => td.innerText === 'View NFT' ? `https://etherscan.io/address/${td.innerHTML.split('/')[2]}`: td.innerText)
        }, "#mytable_mint > tbody > tr td");
        
        data = [...data, ...newData];

    }
    console.log(`Map`)
    const collections = new Map();
    for (let i = 0; i < data.length; i+=9) {
        const url = data[i+8];
        const name = data[i+5];
        const tx = data[i+1];
        if (collections.has(name)) {
            const colObj = collections.get(name);
            colObj.count += 1;
            colObj.txs.push(tx);
            collections.set(name, colObj);
        } else {
            collections.set(name, {url: url, count: 1, txs: [tx]});
        }
    }
    console.log(`Sort`)
    const mapSorted = new Map([...collections.entries()].sort((a,b) => b[1].count - a[1].count));

    console.log(`All done, check the screenshots. ✨`)
    await browser.close()

    for (const [key, obj] of mapSorted.entries()) {
        logger.write({name: key, count: obj.count, url: obj.url});
        //logger.write(`${key} ${process.env.LOG_FILES_SEPARATOR} ${obj.count} ${process.env.LOG_FILES_SEPARATOR} <${obj.url}>\n`)
    }
      
    logger.finish()
}
