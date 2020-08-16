import { EventEmitter } from "events"
import { db } from "../../database"
import { spawn, Thread, Worker } from "threads"
import { StringSet, crawlParams } from "./workers/doCrawl"

interface initCrawlParameters {
    url: string
    delay?: number
    maxUrls?: number
    callback(): void
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
gCrawlerEvents.on("initCrawl", async (params: initCrawlParameters) => {
    const { url, delay, maxUrls, callback } = params
    const database = await db()
    await database.crawler.upsert({ url, databaseItem: { crawledData: [], isCrawling: true } })
    const doCrawl = await spawn<doCrawlWorker>(new Worker("./workers/doCrawl"))
    const crawledData = await doCrawl({ url, maxUrls, delay })
    await database.crawler.upsert({
        url,
        databaseItem: { crawledData: [...crawledData].slice(0, maxUrls), isCrawling: false }
    })
    await Thread.terminate(doCrawl)
    callback()
})
