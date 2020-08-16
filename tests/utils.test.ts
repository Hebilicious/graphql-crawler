import { isUrl, makeXMLSitemapString } from "../src/utils/helpers"

/**
 * Utils unit tests.
 * We can test our helpers here.
 */
describe("Helpers", () => {
    test("Return true for a valid URL", () => {
        expect(isUrl("https://fakedoors.com")).toBe(true)
    })
    test("Return false for a invalid URL", () => {
        expect(isUrl("notanurl")).toBe(false)
    })

    test("Correctly returns an XML String", () => {
        const xml = makeXMLSitemapString(["https://fakedoors.com"])
        expect(xml).toContain("xml")
        expect(xml).toContain("fakedoors")
        expect(xml).toContain("/urlset")
    })
})
