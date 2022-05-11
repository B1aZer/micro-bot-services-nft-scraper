process.env.TZ = 'America/Toronto'
process.on('unhandledRejection', error => {
    throw error;
});

const puppeteer = require('puppeteer-extra')
const Logger = require('../_utils/logger')
const logger = new Logger('prominent-whitelists')

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
        if (response.url() == "https://niftyriver.herokuapp.com/api/social/tweets/whitelist/?") {
            upcoming = (await response.json())["projects"];
        }
    });

    await page.goto('https://www.niftyriver.io/analytics/whitelists', {
        waitUntil: 'networkidle0',
    })
    await page.waitForNetworkIdle()
    
    // sort by followers
    upcoming = upcoming.map(obj => ({name: obj.name, twitter: `https://twitter.com/${obj.twitter_username}`, created: obj.twitter_created, follower_count: obj.follower_count}))
    upcoming.sort((a, b) => b.follower_count - a.follower_count)

    console.log(`All done, check the screenshots. ✨`)
    await browser.close()

    for (const obj of upcoming) {
        logger.write(obj)
    }

    logger.finish()
}
