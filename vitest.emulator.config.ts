import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

/** Firestore·Storage 규칙 테스트 전용 (에뮬레이터 필요). `npm run test:rules` 에서 사용. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/emulator/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
