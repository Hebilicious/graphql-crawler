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

type StringSet = Set<string>

interface crawlParams {
    url: string
    maxUrls?: number
    delay?: number
}

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
 * Init Crawl Event Handler
 *
 * This is the responsible for the main business logic.
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
        return
    } catch (error) {
        console.error(error)
        return
    } finally {
        if (crawlWorker) await Thread.terminate(crawlWorker)
    }
}

export const doCrawl = async ({ url, maxUrls, delay }: crawlParams) => {
    //We'll use two sets to keep track of what to crawl and our results
    const urlsToCrawl: StringSet = new Set()
    const crawledData: StringSet = new Set()

    urlsToCrawl.add(url)

    const crawlLinks = async (urls: StringSet): Promise<void> => {
        try {
            /**
             * 1. Crawl all links
             * Note that Promise.all used like this is not ideal and we could imagine implementing something better
             * Depending on the use-case/scaling: Retry when failure, throttling, or using observables
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
                 * We could imagine having a diffenrent conditions. Maybe we want to
                 * crawl deeper and could accept a depth argument. Or maybe we want
                 * to crawl the associated subdomains.
                 */
                if (link.includes(url)) {
                    urlsToCrawl.add(link)
                }
            })
            /**
             * 3. Keep doing that until we hit our limit.
             * As long as we have URL to crawl and as long as the result don't exceed maxUrls
             */
            if (urlsToCrawl.size > 0 && crawledData.size <= maxUrls) {
                await wait(delay)
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

gCrawlerEvents.on("initCrawl", (p) => initCrawl(p))
