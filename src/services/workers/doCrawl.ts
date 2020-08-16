import { expose } from "threads/worker"
import { wait } from "../../utils/helpers"
import { crawlPage } from "../webCrawl"

export type StringSet = Set<string>

export interface crawlParams {
    url: string
    maxUrls: number
    delay: number
}

expose(async ({ url, maxUrls, delay }: crawlParams) => {
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
            if ([...urlsToCrawl].length > 0 && [...crawledData].length < maxUrls) {
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
})
