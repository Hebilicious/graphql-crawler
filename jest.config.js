module.exports = {
    collectCoverage: true,
    collectCoverageFrom: [
        "<rootDir>/src/**/*.ts",
        "!<rootDir>/src/server.ts",
        "!<rootDir>/src/services/workers/**.ts", //Worker logic leaves outside the file.
        "!<rootDir>/src/services/webCrawl.ts", //Pupeteer and Jest coverage don't like each other https://github.com/facebook/jest/issues/7962
        "!<rootDir>/src/@types/**/*"
    ],
    // coverageDirectory: "coverage",
    // coverageReporters: ["html", "json", "text-summary"],
    preset: "ts-jest"
    // setupFilesAfterEnv: ["./tests/setup.js"]
}
