import { EventEmitter } from "events"
import { db } from "../../database"
import { FunctionThread, spawn, Thread, Worker } from "threads"
import { wait } from "../utils/helpers"
import { crawlPage } from "./webCrawl"

interface initCrawlParameters {
    url: string
    delay?: number
    maxUrls?: number
    callback(): void
}

interface crawlParams {
    url: string
    maxUrls?: number
    delay?: number
}

type StringSet = Set<string>

type doCrawlWorker = (parameters: crawlParams) => Promise<StringSet>

/**
 * This is our event emitter instance.
 */
export const gCrawlerEvents = new EventEmitter()

/**
 * This is a dispatch function associated with our event bus.
 * It gets attached to the apollo context so we can use it
 * in our graphQL resolvers.
 * @param {string} event Event name
 * @param {initCrawlParameters} params Crawl parameters
 * @param {any} args Eventual additional arguments
 */
export const dispatch = (event: string, params: initCrawlParameters, ...args) =>
    gCrawlerEvents.emit(event, params, ...args)

/**
 * Init Crawl Handler
 *
 * This handler is responsible for the main business logic.
 * 1. First we add a DB entry with the base URL
 * 2. We spawn a new worker that will crawl the base URL recursively.
 * 3. When we're done, we update the DB with the sliced crawled data.
 * 4. We terminate the worker
 * 5. We run our callback (which sends our pubsub event)
 */
export const initCrawl = async (params: initCrawlParameters) => {
    let crawlWorker: FunctionThread<[crawlParams], StringSet>
    try {
        const { url, delay, maxUrls, callback } = params
        const database = await db()
        await database.crawler.upsert({ url, databaseItem: { crawledData: [], isCrawling: true } })
        crawlWorker = await spawn<doCrawlWorker>(new Worker("./workers/crawlWorker"))
        const crawledData = await crawlWorker({ url, maxUrls, delay })
        await database.crawler.upsert({
            url,
            databaseItem: { crawledData: [...crawledData].slice(0, maxUrls), isCrawling: false }
        })
        callback()
    } catch (error) {
        console.error(error)
    } finally {
        if (crawlWorker) await Thread.terminate(crawlWorker)
        // eslint-disable-next-line no-unsafe-finally
        return
    }
}

/**
 * This function crawl an URL recursively and returns
 * a Set of urls as the result. The code includes
 * a lot of comments to walk you through the gotchas.
 * This method used to be directly inlined in the Worker
 * file, but that made it hard to test with jest.
 * For the sake of simplicity it is exported
 * here instead.
 * @param {string} url The url to Crawl
 * @param {number} maxUrls The limit of URLs we want to crawl.
 * @param {delay} delay The delay between each crawl batch.
 */
export const doCrawl = async ({ url, maxUrls, delay }: crawlParams) => {
    //We'll use two sets to keep track of what to crawl and our results
    const urlsToCrawl: StringSet = new Set()
    const crawledData: StringSet = new Set()

    urlsToCrawl.add(url)

    const crawlLinks = async (urls: StringSet): Promise<void> => {
        try {
            /**
             * 1. Crawl all links
             * Note that Promise.all used like has some advantage : It fires all the requests
             * concurrently. Since we're crawling different URLs and spawning a pupeteer instance
             * on every crawlPage call, this could break at some point. We could write a sequential
             * implementation like this :
             * ```urls.reduce(async (p,url)=> {
             *        await p
             *        await wait(50) //We could implement a delay between each crawl like that.
             *        return crawlPage({url})
             * }, Promise.resolve())
             * ```
             * Not of that is ideal and async code can be hard to deal with when it's dynamic.
             * Depending on the use-case/scaling: We would need to implement Retry when failures, throttling,
             * error handling, we might want to use observables over promises etc
             */
            const results = await Promise.all([...urls].map((url) => crawlPage({ url })))
            const links = results.flat()
            urlsToCrawl.clear()
            links.forEach((link) => {
                crawledData.add(link)
                /**
                 * 2. If there is links returned that match the same domain, crawl them.
                 * This is important as we don't want to keep crawling infinitely !
                 * This logic works fine for our application since the goal is to
                 * generate a sitemap.
                 * We could imagine having a different conditions. Maybe we want to
                 * crawl deeper and could accept a depth argument. Or maybe we want
                 * to crawl the associated subdomains.
                 */
                if (link.includes(url)) {
                    urlsToCrawl.add(link)
                }
            })
            /**
             * 3. Keep doing that until we hit our limit.
             * As long as we have URLs to crawl and as long as the result don't exceed maxUrls
             * We want to keep the crawling going.
             */
            if (urlsToCrawl.size > 0 && crawledData.size <= maxUrls) {
                await wait(delay) //As explained in 1., this could be implemented sequentially.
                return crawlLinks(urlsToCrawl)
            }
            return
        } catch (error) {
            console.error(error)
            return
        }
    }

    await crawlLinks(urlsToCrawl)

    return crawledData
}

/**
 * Event handler.
 * This is attached to our event emitter and route
 * our received events to the initCrawl handler.
 */
gCrawlerEvents.on("initCrawl", (p) => initCrawl(p))
