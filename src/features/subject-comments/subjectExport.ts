/** 학생별 초안 목록을 행발과 같은 형식의 엑셀 한 장으로 내려받는다. */
export const downloadStudentDraftWorkbook = async (
  label: string,
  numbers: { id: string; number: number }[],
  texts: Record<string, string>,
) => {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(label.slice(0, 30));
  sheet.columns = [
    { header: "번호", key: "number", width: 10 },
    { header: label, key: "text", width: 80 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const entry of [...numbers].sort((a, b) => a.number - b.number)) {
    const text = texts[entry.id];
    if (text) sheet.addRow({ number: entry.number, text });
  }
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${label.replace(/\s+/gu, "_")}_${date}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
