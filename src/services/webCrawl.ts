import puppeteer, { Browser, DirectNavigationOptions } from "puppeteer"

//https://pptr.dev/#?product=Puppeteer&version=v5.2.1&show=api-pagegotourl-options

interface webCrawlConfiguration {
    url: string
    options?: DirectNavigationOptions
}

/**
 * Returns a list of all the anchor elements href attributes for a given url.
 * @example
 * const links = await crawlPage({ url: "https://emmanuel.style" })
 * @param {String} url - The page URL to crawl against.
 * @param {DirectNavigationOptions} [options] - Puppeteer page.goto parameters.
 */
export const crawlPage = async ({
    url,
    options = {
        waitUntil: "networkidle0",
        timeout: 30000 //ms
    }
}: webCrawlConfiguration) => {
    let browser: Browser
    try {
        browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        await page.setViewport({ width: 1920, height: 1080 })
        await page.goto(url, options)
        const links = await page.$$eval("a", (as) => as.map((a: HTMLAnchorElement) => a.href))
        return links
    } catch (e) {
        console.error(e)
        return []
    } finally {
        await browser.close()
    }
}
