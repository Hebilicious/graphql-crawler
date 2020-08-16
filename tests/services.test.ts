/* eslint-disable @typescript-eslint/no-empty-function */
import { crawlPage } from "../src/services/webCrawl"
import * as handleCrawl from "../src/services/handleCrawl"

describe("Crawler Tests", () => {
    test("Can crawl a single page", async () => {
        const links = await crawlPage({ url: "https://emmanuel.style" }) //My personal website has 3 external links atm.
        expect(Array.isArray(links)).toBe(true)
        expect(links.length).toBeGreaterThanOrEqual(3)
    }, 30000)
    test("Can crawl recursively", async () => {
        const crawledData = await handleCrawl.doCrawl({ url: "https://google.com" }) //Has a lot of links
        expect(crawledData instanceof Set).toBe(true)
        expect(crawledData.size).toBeGreaterThanOrEqual(10)
    }, 30000)

    test("Can initiate a crawl from the handler", async () => {
        const callback = jest.fn()
        await handleCrawl.initCrawl({ url: "https://emmanuel.style", callback })
        expect(callback).toBeCalledTimes(1)
    }, 30000)
})

describe("Event Flow", () => {
    beforeAll((done) => {
        jest.clearAllMocks()
        //Dispatch an Event
        handleCrawl.dispatch("initCrawl", { url: "https://emmanuel.style", callback })
        done()
    })

    const emitSpy = jest.spyOn(handleCrawl.gCrawlerEvents, "emit")
    const initCrawlSpy = jest.spyOn(handleCrawl, "initCrawl")
    const callback = jest.fn()

    test("Dispatching an Event call the event emitter", () => {
        expect(emitSpy).toHaveBeenCalledWith(
            "initCrawl",
            expect.objectContaining({ url: "https://emmanuel.style", callback: expect.any(Function) })
        )
    })
    test("The Event Emitter call the initCrawl Handler", () => {
        expect(initCrawlSpy).toHaveBeenCalledTimes(1)
    })
})
