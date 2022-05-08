process.env.TZ = 'America/Toronto' 
process.on('unhandledRejection', error => {
    throw error;
});

const puppeteer = require('puppeteer-extra')
const fs = require('fs');


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

    await page.goto('https://etherscan.io/nfttracker#mint', {
        waitUntil: 'networkidle0',
    })
    //await page.waitForTimeout(10000)
    //await page.waitForSelector('#mytable_mint .hash-tag');
    //await page.screenshot({ path: 'etherscan.png', fullPage: true })
    await page.waitForTimeout(10000)
    //select 100
    await page.select('#mytable_mint_length > label > select', '100');
    await page.waitForNetworkIdle()

    let data = await page.evaluate((sel) => {
        const tds = Array.from(document.querySelectorAll(sel))
        return tds.map(td => td.innerText === 'View NFT' ? `https://etherscan.io/address/${td.innerHTML.split('/')[2]}`: td.innerText)
    }, "#mytable_mint > tbody > tr td");

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
    const mapSorted = new Map([...collections.entries()].sort((a,b) => b[1].count - a[1].count));

    console.log(`All done, check the screenshots. ✨`)
    await browser.close()

    const logger = fs.createWriteStream(`/home/hipi/Sites/GooDee/nft-scraper/logs/${(new Date().toJSON())}.txt`, {
        flags: 'a'
    });

    for (const [key, obj] of mapSorted.entries()) {
        logger.write(`${key} | ${obj.count} | <${obj.url}>\n`)
    }
      
    logger.end()
}
