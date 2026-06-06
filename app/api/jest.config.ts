import type { Config } from "jest";

const config: Config = {
  displayName: "unit",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  clearMocks: true,
  setupFilesAfterEnv: [
    "<rootDir>/src/__tests__/unit/setup/setupFile.ts",
  ],
  collectCoverageFrom: [
    "src/domains/**/*.service.ts",
    "src/domains/**/*.repository.ts",
    "src/domains/**/*.validator.ts",
    "src/shared/utils/*.ts",
    "src/infra/pubsub/*.ts",
    "src/infra/cache/*.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
    },
  },
};

export default config;