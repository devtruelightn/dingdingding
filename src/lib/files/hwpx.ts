import { parseExtractedText } from "./extract";
import {
  decodeBytes,
  MAX_UNZIPPED,
  MAX_ZIP_ENTRIES,
  type ExtractedPlanRow,
} from "./types";

/** HWPX(zip + XML) 문서에서 성취기준 텍스트를 추출한다. jszip은 필요할 때만 로드한다. */
export const parseHwpx = async (buffer: ArrayBuffer): Promise<ExtractedPlanRow[]> => {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true, createFolders: false });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("압축 문서의 파일 수가 안전 제한을 초과했습니다.");
  }
  const xmlEntries = entries.filter((entry) =>
    /(?:Contents|Preview)\/.*\.xml$|content\.hpf$/i.test(entry.name),
  );
  let total = 0;
  const chunks: string[] = [];
  for (const entry of xmlEntries) {
    const bytes = await entry.async("uint8array");
    total += bytes.byteLength;
    if (total > MAX_UNZIPPED) throw new Error("압축 해제 크기가 안전 제한을 초과했습니다.");
    const document = new DOMParser().parseFromString(decodeBytes(bytes), "application/xml");
    if (document.querySelector("parsererror")) continue;
    chunks.push(
      [...document.querySelectorAll("t, hp\\:t")].map((node) => node.textContent ?? "").join(" "),
    );
  }
  return parseExtractedText(chunks.join("\n"));
};
