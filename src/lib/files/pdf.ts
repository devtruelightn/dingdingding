import { parseExtractedText } from "./extract";
import type { ExtractedPlanRow } from "./types";

/**
 * pdf.js worker 파일은 `tools/copy-pdf-worker.mjs`(predev/prebuild)가
 * `public/pdf.worker.min.mjs`로 복사한다. 정적 export에서도 같은 경로로 제공된다.
 */
const PDF_WORKER_SRC = "/pdf.worker.min.mjs";

/** PDF의 모든 쪽에서 평문을 뽑는다. pdfjs-dist는 필요할 때만 로드한다. */
export const extractPdfText = async (buffer: ArrayBuffer): Promise<string> => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  if (document.numPages > 120) throw new Error("PDF는 120쪽 이하만 분석할 수 있습니다.");
  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const text = pages.join("\n");
  if (text.replace(/\s/g, "").length < 30) {
    throw new Error("텍스트가 없는 스캔 PDF입니다. OCR이 가능한 PDF로 변환해 주세요.");
  }
  return text;
};

/** PDF에서 성취기준 텍스트를 추출한다. */
export const parsePdf = async (buffer: ArrayBuffer): Promise<ExtractedPlanRow[]> =>
  parseExtractedText(await extractPdfText(buffer));
