import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    // 에뮬레이터 테스트는 `npm run test:rules` 로만 실행한다.
    include: ["tests/unit/**/*.test.ts", "tests/ai/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
