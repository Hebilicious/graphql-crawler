interface DatabaseItem {
    isCrawling: boolean
    crawledData: url[]
}

export type url = string

interface insertData {
    url: url
    databaseItem: DatabaseItem
}

const datastore: Map<url, DatabaseItem> = new Map()

/* eslint-disable @typescript-eslint/no-unused-vars */
export const db = async () => {
    return {
        crawler: {
            get: async (url: url) => datastore.get(url),
            upsert: async ({ url, databaseItem }: insertData) => datastore.set(url, databaseItem),
            getAll: async () => [...datastore],
            getCurrentlyCrawled: async () => [...datastore].filter(([key, { isCrawling }]) => isCrawling),
            getDoneCrawled: async () => [...datastore].filter(([key, { isCrawling }]) => !isCrawling),
            has: async (url: url) => datastore.has(url),
            delete: async (url: url) => datastore.delete(url),
            flush: async () => datastore.clear()
        }
    }
}
