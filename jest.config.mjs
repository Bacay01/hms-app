import nextJest from "next/jest.js";

// next/jest lets Jest understand `import` syntax and the "@/..." path alias
const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
});
