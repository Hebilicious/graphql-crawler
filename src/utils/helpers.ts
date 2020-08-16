const baseSitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
const endSitemap = `</urlset>`

/**
 * Construct an XML Sitemap string.
 * @param {string[]} links Array of urls.
 */
export const makeXMLSitemapString = (links: string[]) => {
    const xml = links.reduce(
        (acc, link) => acc + `<url><loc>${link}</loc><changefreq>weekly</changefreq></url>`,
        baseSitemap
    )
    return xml + endSitemap
}

/**
 * Wait function that can be awaited and resolves after
 * the inputted time in millisecond.
 * @param {number} ms Time to wait
 */
export const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Loosely validate a URL `string`.
 *
 * @param {String} string
 */
export const isUrl = (string: string) => {
    const match = string.match(/^(?:\w+:)?\/\/(\S+)$/)
    if (!match) return false

    const everythingAfterProtocol = match[1]
    if (!everythingAfterProtocol) return false

    if (
        /^localhost[:?\d]*(?:[^:?\d]\S*)?$/.test(everythingAfterProtocol) ||
        /^[^\s.]+\.\S{2,}$/.test(everythingAfterProtocol)
    ) {
        return true
    }

    return false
}
