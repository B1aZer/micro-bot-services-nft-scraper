const puppeteer = require('puppeteer-extra')
const Logger = require('../_utils/logger')
const logger = new Logger('browser')

process.env.TZ = 'America/Toronto'
process.on('unhandledRejection', error => {
    logger.finish();
    // exits browser
    throw error;
});

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const randomUseragent = require('random-useragent');
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 73.0.3683.75 Safari / 537.36';

const userAgent = randomUseragent.getRandom();
const UA = userAgent || USER_AGENT;

class Browser {
    constructor() {
        this.start();
    }
    async start() {
        this.browser = await puppeteer.launch({ headless: false });
        this.page = await this.browser.newPage();
        //Randomize viewport size
        await this.page.setViewport({
            width: 1920 + Math.floor(Math.random() * 100),
            height: 3000 + Math.floor(Math.random() * 100),
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: false,
            isMobile: false,
        });
        await this.page.setUserAgent(UA);
        await this.page.setJavaScriptEnabled(true);
    }
    async finish() {
        await this.browser.close()
        logger.finish();
    }
}

module.exports = new Browser();
