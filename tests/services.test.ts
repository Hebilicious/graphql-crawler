import { crawlPage } from "../src/services/webCrawl"

describe("Crawler Tests", () => {
    test("Can crawl a single page", async () => {
        const links = await crawlPage({ url: "https://emmanuel.style" }) //My personal website has 3 external links atm.
        expect(Array.isArray(links)).toBe(true)
        expect(links.length).toBeGreaterThan(2)
    }, 30000)
})
