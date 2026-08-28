import type { BehaviorWorkState } from "@/types";

export const behaviorExportRows = (state: BehaviorWorkState) =>
  state.students
    .slice(0, state.studentCount)
    .sort((a, b) => a.studentNumber - b.studentNumber)
    .map((student) => ({ number: student.studentNumber, text: student.finalText }));

export const downloadBehaviorWorkbook = async (state: BehaviorWorkState) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("행발");
  sheet.columns = [
    { header: "번호", key: "number", width: 10 },
    { header: "행동특성 및 종합의견", key: "text", width: 80 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of behaviorExportRows(state)) sheet.addRow(row);
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `행동특성_종합의견_${date}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
