import { makeSchema, queryField } from "@nexus/schema"
import * as path from "path"

import { CrawlerStatus, CrawlUrl, GetCrawledData } from "./types/crawl"
import { GQLDate, GQLJson } from "./types/scalar"
import { GenerateSitemap } from "./types/sitemap"

/**
 * This is a demo query that we can use for health-checking.
 */
const Ok = queryField("ok", { type: "Boolean", resolve: () => true })

const types = [Ok, CrawlUrl, CrawlerStatus, GetCrawledData, GenerateSitemap, GQLDate, GQLJson]

export const schema = makeSchema({
    types,
    outputs: {
        schema: path.join(__dirname, "./schema.graphql"),
        typegen: path.join(__dirname, "../../node_modules/@types/nexus-typegen/index.d.ts")
    },
    typegenAutoConfig: {
        contextType: "Context.Context",
        sources: [
            {
                source: path.resolve(__dirname, "./context.ts"),
                alias: "Context"
            }
        ]
    }
})
