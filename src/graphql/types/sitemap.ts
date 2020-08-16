import { booleanArg, objectType, queryField, stringArg } from "@nexus/schema"
import { makeXMLSitemapString } from "../../utils/helpers"

/**
 * Object GraphQL type
 *
 * This is used by the generateSitemap query
 */
const SiteMapData = objectType({
    name: "SiteMapData",
    description: "Sitemap in XML and JSON.",
    definition: (t) => {
        t.json("json", { description: "Crawled Data JSON array." })
        t.string("xml", { description: "XML Sitemap string." })
    }
})

/**
 * Implements the generateSitemap Query
 *
 * Note that here, we're following the stories without thinking too much about it.
 * This logic could be tweaked to start the crawl logic instead of erroring.
 * A sitemap doesn't contains external links by default, but we'll offer the option to include them.
 * We're returning both an XML Sitemap String and a JSON payload containings the crawled data.
 *
 * @returns {SiteMapData} SiteMapData
 */
export const GenerateSitemap = queryField("generateSitemap", {
    type: SiteMapData,
    args: {
        url: stringArg({
            required: true,
            description: "This needs to be a crawled URL, ie crawlUrl needs to finish running first."
        }),
        externalLinks: booleanArg({
            nullable: true,
            default: false,
            description:
                "Wether or not we want to include the Crawled externals links. A valid Sitemap XML shouldn't include them."
        })
    },
    description: "Generate a sitemap for a crawled URL.",
    resolve: async (parent, { url, externalLinks }, context) => {
        const db = await context.db()
        if (!(await db.crawler.has(url))) {
            throw new Error(
                `query crawlUrl(input:{url:${url}}) needs to run successfully before we generate a sitemap.`
            )
        }
        const { crawledData } = await db.crawler.get(url)
        const hrefs = externalLinks ? crawledData : crawledData.filter((link) => link.includes(url))
        const xml = makeXMLSitemapString(hrefs)
        return { json: { hrefs }, xml }
    }
})
