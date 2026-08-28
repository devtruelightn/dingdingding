import { rowsFromGrid } from "./extract";
import { cleanFormula, type ExtractedPlanRow } from "./types";

/** XLSX 워크북에서 성취기준 행을 추출한다. exceljs는 필요할 때만 로드한다. */
export const parseXlsx = async (buffer: ArrayBuffer): Promise<ExtractedPlanRow[]> => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows: string[][] = [];
  workbook.eachSheet((sheet) =>
    sheet.eachRow((row) => {
      rows.push(
        (row.values as unknown[])
          .slice(1)
          .map((value) =>
            cleanFormula(
              typeof value === "object" && value && "text" in value
                ? (value as { text: string }).text
                : value,
            ),
          ),
      );
    }),
  );
  return rowsFromGrid(rows);
};
