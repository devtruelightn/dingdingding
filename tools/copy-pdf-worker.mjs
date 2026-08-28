// pdf.js worker 파일을 public/ 로 복사한다. (predev / prebuild 에서 실행)
// 정적 export 환경에서도 /pdf.worker.min.mjs 로 제공되도록 한다.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const dest = join(process.cwd(), "public", "pdf.worker.min.mjs");
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(workerPath, dest);
  console.log("[copy-pdf-worker] public/pdf.worker.min.mjs updated");
} catch (error) {
  console.warn("[copy-pdf-worker] skipped:", error.message);
}
