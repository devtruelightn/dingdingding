import { rowsFromGrid } from "./extract";
import { cleanFormula, type ExtractedPlanRow } from "./types";

/**
 * 엑셀 셀 하나를 문자열로 편다.
 * 서식이 섞인 칸은 richText 조각으로, 수식 칸은 result로 들어오므로
 * 그대로 String()하면 "[object Object]"가 된다.
 */
export const cellText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "object") {
    const cell = value as Record<string, unknown>;
    if (Array.isArray(cell.richText)) {
      return cell.richText.map((part) => String((part as { text?: string }).text ?? "")).join("");
    }
    if ("text" in cell) return String(cell.text ?? "");
    if ("result" in cell) return String(cell.result ?? "");
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return "";
  }
  return String(value);
};

/** XLSX 워크북의 첫 시트들을 문자열 그리드로 읽는다. exceljs는 필요할 때만 로드한다. */
export const readXlsxGrid = async (buffer: ArrayBuffer): Promise<string[][]> => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows: string[][] = [];
  workbook.eachSheet((sheet) =>
    sheet.eachRow((row) => {
      rows.push((row.values as unknown[]).slice(1).map((value) => cleanFormula(cellText(value))));
    }),
  );
  return rows;
};

/** XLSX 워크북에서 성취기준 행을 추출한다. */
export const parseXlsx = async (buffer: ArrayBuffer): Promise<ExtractedPlanRow[]> =>
  rowsFromGrid(await readXlsxGrid(buffer));
