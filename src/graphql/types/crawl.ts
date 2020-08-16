import { inputObjectType, intArg, objectType, queryField, subscriptionField } from "@nexus/schema"
import { isUrl } from "../../utils/helpers"

/**
 * Input Object GraphQL Type
 *
 * This is used by the crawlUrl query.
 */
const CrawlUrlInputType = inputObjectType({
    name: "CrawlUrlInput",
    description: "Input parameters for the crawlUrl query",
    definition: (t) => {
        t.string("url", { description: "Base url for the crawler." })
        t.int("delay", { nullable: true, default: 0, description: "Delay for the crawler" })
        t.int("maxUrls", {
            nullable: true,
            default: 100,
            description: "The maximum amount of crawled URLs per crawl."
        })
    }
})

/**
 * Object GraphQL type
 *
 * This is returned by the crawlerStatus subscription.
 */
const CrawlerStatusData = objectType({
    name: "CrawlerStatusData",
    description: "The return type for the crawler Status subscription.",
    definition: (t) => {
        t.list.string("currentlyCrawled", { description: "List of urls currently being crawled." })
        t.int("doneCrawled", { description: "Urls done crawling." })
    }
})

/**
 * Object GraphQL type
 *
 * This is returned by the getCrawledData query.
 */
const CrawledData = objectType({
    name: "CrawledData",
    description: "Return the entire crawling data.",
    definition: (t) => {
        t.string("url", { description: "The base url." })
        t.boolean("isCrawling", { description: "Crawl current status." })
        t.list.string("crawledData", { description: "List of found urls." })
    }
})

/**
 * Implements the CrawlerStatus subscription.
 *
 * We're listening to "START_CRAWL" and "END_CRAWL" events from our pubsub interface.
 * When we receive those, our resolver fire, we query our database and
 * display the ongoing operations using the CrawlerStatusData type.
 * @returns {CrawlerStatusData} CrawlerStatusData
 */
export const CrawlerStatus = subscriptionField("crawlerStatus", {
    type: CrawlerStatusData,
    description: "Subscribtion endpoint that gives information about the ongoing crawling operations.",
    subscribe: (payload, args, context) => context.pubsub.asyncIterator(["START_CRAWL", "END_CRAWL"]),
    resolve: async (payload, args, context) => {
        const db = await context.db()
        const currentlyCrawled = await db.crawler.getCurrentlyCrawled()
        const doneCrawled = await db.crawler.getDoneCrawled()
        return { doneCrawled: doneCrawled.length, currentlyCrawled: currentlyCrawled.map(([url]) => url) }
    }
})

/**
 * Implements the CrawlUrl query.
 *
 * 1. We'll first check if the URL is valid and throw if it isn't.
 * 2. Then initiate the crawling operation.
 * 3. Fire the "START_CRAWL" pubsub event.
 *
 * @returns {String} Confirmation message.
 */
export const CrawlUrl = queryField("crawlUrl", {
    type: "String",
    description: "Start a crawler for a given URL",
    args: { input: CrawlUrlInputType },
    resolve: async (parent, { input: { url, delay, maxUrls } }, context) => {
        if (!isUrl(url)) throw new Error(`${url} is not a valid URL.`)
        context.dispatch("initCrawl", {
            url,
            delay,
            maxUrls,
            callback: () => context.pubsub.publish("END_CRAWL", { url })
        })
        context.pubsub.publish("START_CRAWL", { url })
        return `Started Crawling ${url} 🚀🚀🚀`
    }
})

/**
 * Implements the GetCrawledData query.
 *
 * We use a simple skip/take pagination system with low default values as a PoC.
 * Skip and Take are optionals arguments accepted by the query.
 * Using a cursor type pagination would be better if performances was a concern.
 * It is also very easy to implement Relay style pagination if needed.
 * nexus/schema comes with helpers to do that out of the box : https://nexusjs.org/components-standalone/schema/plugins/connection
 * We use native array methods for the resolver implementation.
 *
 * @returns {CrawledData} CrawledData
 */
export const GetCrawledData = queryField("getCrawledData", {
    type: CrawledData,
    description: "Return a paginated list of Crawled Data.",
    list: true,
    args: {
        skip: intArg({ nullable: true, default: 0, description: "Skip the first n elements." }),
        take: intArg({ nullable: true, default: 5, description: "Take n elements." })
    },
    resolve: async (parent, { skip, take }, context) => {
        const db = await context.db()

        const allData = await db.crawler.getAll()
        return allData
            .slice(skip, skip + take)
            .map(([url, { isCrawling, crawledData }]) => ({ url, isCrawling, crawledData }))
    }
})
