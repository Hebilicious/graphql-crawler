import { db } from "../database/index"

const data = { url: "test", databaseItem: { crawledData: ["abc", "def"], isCrawling: false } }

beforeEach(async () => {
    const database = await db()
    return database.crawler.upsert(data)
})

afterEach(async () => {
    const database = await db()
    return database.crawler.flush()
})

describe("Database tests", () => {
    test("Can query an item", async () => {
        const database = await db()
        const item = await database.crawler.get("test")
        expect(item).toStrictEqual({ crawledData: ["abc", "def"], isCrawling: false })
    })

    test("Can delete an item", async () => {
        const database = await db()
        await database.crawler.delete("test")
        const exists = await database.crawler.has("test")
        expect(exists).toBe(false)
    })

    test("Can upsert an item", async () => {
        const toUpsert = {
            url: "entry",
            databaseItem: { crawledData: [], isCrawling: true }
        }
        const database = await db()
        await database.crawler.upsert(toUpsert)
        const item = await database.crawler.get("entry")

        expect(item).toStrictEqual({ crawledData: [], isCrawling: true })
    })

    test("Can query all results", async () => {
        const database = await db()
        const allResults = await database.crawler.getAll()
        expect(allResults.length).toBe(1)
        expect(allResults[0]).toStrictEqual(["test", { crawledData: ["abc", "def"], isCrawling: false }])
    })
})
