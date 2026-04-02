/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@medora/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    /** ESM-style `.js` re-exports in shared `src` — resolve to `.ts` for Jest. */
    "^.*packages/shared/src/(.+)\\.js$": "<rootDir>/../../packages/shared/src/$1.ts",
    /** Relative `./constants/*.js` from shared `index.ts` resolves from api cwd — map to shared `src`. */
    "^\\.\\/constants\\/(.*)\\.js$": "<rootDir>/../../packages/shared/src/constants/$1.ts",
    "^\\.\\/schemas\\/(.*)\\.js$": "<rootDir>/../../packages/shared/src/schemas/$1.ts"
  }
};

