import type { Config } from "jest";

const config: Config = {
  displayName: "integration",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  modulePaths: ["<rootDir>"],
  testMatch: ["<rootDir>/src/__tests__/integration/**/*.integration.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  testTimeout: 60_000,
  clearMocks: true,
  resetModules: false,
  restoreMocks: false,
  verbose: true,
  forceExit: true,
  globalSetup: "<rootDir>/src/__tests__/integration/setup/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/integration/setup/globalTeardown.ts",
  setupFilesAfterEnv: [
    "<rootDir>/src/__tests__/integration/setup/setupFiles.ts",
  ],
  collectCoverageFrom: [
    "src/domains/**/*.service.ts",
    "src/domains/**/*.repository.ts",
    "src/shared/utils/*.ts",
  ],
};

export default config;