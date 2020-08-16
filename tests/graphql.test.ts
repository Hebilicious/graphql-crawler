import { ApolloServerTestClient, createTestClient } from "apollo-server-testing"
import { createContext } from "../src/graphql/context"
import { schema } from "../src/graphql/schema"

import { ApolloServer, gql } from "apollo-server-fastify"
import { db } from "../database"

let Client: ApolloServerTestClient

beforeAll(() => {
    const server = new ApolloServer({ schema, context: createContext })
    Client = createTestClient(server)
})

test("Can send the ok query", async () => {
    const { query } = Client
    const { data } = await query({
        query: gql`
            query okQuery {
                ok
            }
        `
    })
    if (!data) throw new Error("No data")
    expect(data).toHaveProperty("ok")
    expect(data.ok).toBe(true)
})

describe("Crawl", () => {
    test("Can use the crawlUrl operation", async () => {
        const { query } = Client
        const { data } = await query({
            query: gql`
                query crawl {
                    crawlUrl(input: { url: "https://emmanuel.style" })
                }
            `
        })
        if (!data) throw new Error("No data")
        expect(data).toHaveProperty("crawlUrl")
        expect(data.crawlUrl).toContain("emmanuel.style")
    })

    test("Can use the getCrawledData operation", async () => {
        const database = await db()
        //Insert 50 test items
        Array.from({ length: 50 }).forEach(async (n, index) => {
            await database.crawler.upsert({
                url: `test-${index}`,
                databaseItem: { crawledData: [], isCrawling: true }
            })
        })
        const { query } = Client
        const { data } = await query({
            query: gql`
                query crawlData {
                    getCrawledData(skip: 1, take: 12) {
                        url
                        isCrawling
                        crawledData
                    }
                }
            `
        })
        if (!data) throw new Error("No data")
        expect(data).toHaveProperty("getCrawledData")
        expect(Array.isArray(data.getCrawledData)).toBe(true)
        expect(data.getCrawledData.length).toBeGreaterThanOrEqual(12)
        //Remove the 50 test items
        Array.from({ length: 50 }).forEach(async (n, index) => {
            await database.crawler.delete(`test-${index}`)
        })
    })
})

describe("Sitemap", () => {
    beforeAll(async () => {
        const database = await db()
        await database.crawler.upsert({
            url: `https://example.com`,
            databaseItem: {
                crawledData: ["https://example.com/foo", "https://example.com/bar", "https://test.com/bar"],
                isCrawling: false
            }
        })
    })
    afterAll(async () => {
        const database = await db()
        await database.crawler.delete("https://example.com")
    })
    test("Can generate a valid Sitemap", async () => {
        const { query } = Client
        const { data } = await query({
            query: gql`
                query sitemap {
                    generateSitemap(url: "https://example.com", externalLinks: false) {
                        json
                        xml
                    }
                }
            `
        })
        if (!data) throw new Error("No data")
        expect(data).toHaveProperty("generateSitemap.json.hrefs")
        expect(data).toHaveProperty("generateSitemap.xml")
        expect(data.generateSitemap.xml).toMatchSnapshot()
        expect(data.generateSitemap.json.hrefs).toHaveLength(2)
    })

    test("Can generate a 'sitemap' with external links.", async () => {
        const { query } = Client
        const { data } = await query({
            query: gql`
                query sitemap {
                    generateSitemap(url: "https://example.com", externalLinks: true) {
                        json
                        xml
                    }
                }
            `
        })
        if (!data) throw new Error("No data")
        expect(data).toHaveProperty("generateSitemap.json.hrefs")
        expect(data).toHaveProperty("generateSitemap.xml")
        expect(data.generateSitemap.xml).toMatchSnapshot()
        expect(data.generateSitemap.json.hrefs).toHaveLength(3)
    })
})

describe("End to End", () => {
    beforeAll(async () => {
        const { query } = Client
        await query({
            query: gql`
                query crawl {
                    crawlUrl(input: { url: "https://google.com" })
                }
            `
        })
        await query({
            query: gql`
                query crawl {
                    crawlUrl(input: { url: "https://emmanuel.style" })
                }
            `
        })
    })
    test("Crawling an url correctly write to the database", async () => {
        const database = await db()
        const googleExists = await database.crawler.has("https://google.com")
        const emmanuelExists = await database.crawler.has("https://emmanuel.style")
        expect(googleExists).toBe(true)
        expect(emmanuelExists).toBe(true)
    })
})
