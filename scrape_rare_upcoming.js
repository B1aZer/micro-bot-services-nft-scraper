require('dotenv').config();

const puppeteer = require('puppeteer-extra')
const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');
const Logger = require('../_utils/logger')
const logger = new Logger('rare-upcoming')

process.env.TZ = 'America/Toronto'
process.on('unhandledRejection', error => {
    logger.finish();
    throw error;
});

const userClient = new TwitterApi({
    appKey: '2yoD9AScEFJWIVI6lc6Nmg',
    appSecret: 'qf2Pi3qsHvA0RjomsnNRhY5iKDWHIVy9DQWGBzDQIkw',
    // Following access tokens are not required if you are
    // at part 1 of user-auth process (ask for a request token)
    // or if you want a app-only client (see below)
    accessToken: '41890375-2jC8etQNIDnskeTxifSLD45FsufIBXSewLTdUGhpa',
    accessSecret: 'LrVnDgj1tEDTaSn1gR8D8klkUEMhHRZOnmAbFrh8Tl2KD',
  });
  
// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const randomUseragent = require('random-useragent');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 73.0.3683.75 Safari / 537.36';


const userAgent = randomUseragent.getRandom();
const UA = userAgent || USER_AGENT;

init();

async function init() {
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

    let upcoming = []
    page.on('response', async (response) => {
        if (response.url() == "https://collections.rarity.tools/upcoming2") {
            upcoming = await response.json();
        }
    });

    await page.goto('https://rarity.tools/upcoming', {
        waitUntil: 'networkidle0',
    })
    await page.waitForNetworkIdle()
    
    const date = new Date();
    // filter tomorrow
    upcoming = upcoming.filter((proj) => {
        let projDate = new Date(proj["Sale Date"]);
        return projDate.getFullYear() === date.getFullYear()
            && projDate.getMonth() === date.getMonth()
            && projDate.getDate() === date.getDate() + 1;   
    })

    const collections = new Map();
    for (let i = 0; i < upcoming.length; i++) {
        const id = upcoming[i]["id"];
        const name = upcoming[i]["Project"];
        const saleDate = upcoming[i]["Sale Date"];
        const twitterId = upcoming[i]["TwitterId"];
        const followerCount = (await userClient.v1.user({ screen_name: twitterId }))["followers_count"];
        collections.set(id, { name: name, saleDate: saleDate, twitter: `https://twitter.com/${twitterId}`, followerCount: followerCount});
    }
    const mapSorted = new Map([...collections.entries()].sort((a, b) => b[1].followerCount - a[1].followerCount));

    console.log(`All done, check the screenshots. ✨`)
    await browser.close()

    for (const [key, obj] of mapSorted.entries()) {
        logger.write(obj);
    }

    logger.finish()
}
