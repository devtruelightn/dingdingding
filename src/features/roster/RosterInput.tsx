"use client";

import { useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { Button } from "@/components/ui";
import { storeLocalRoster } from "@/lib/local-db";
import { parseRoster } from "@/lib/roster";
import type { Student } from "@/types";

interface RosterInputProps {
  students: Student[];
  setStudents: (students: Student[]) => void;
  toast: (message: string) => void;
}

/** 명단 붙여넣기 / CSV 불러오기 + 미리보기. 실명은 IndexedDB에만 저장한다. */
export function RosterInput({ students, setStudents, toast }: RosterInputProps) {
  const [value, setValue] = useState("김하늘\n이바다\n박새봄\n최가온");
  const fileInput = useRef<HTMLInputElement>(null);

  const apply = () => {
    const parsed = parseRoster(value);
    const limited = parsed.students.slice(0, 40);
    setStudents(limited);
    void storeLocalRoster("current-class", limited);
    toast(
      parsed.warnings.length
        ? `${parsed.students.length}명 확인 · 경고 ${parsed.warnings.length}건`
        : `${parsed.students.length}명의 명단을 확인했습니다.`,
    );
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast("파일은 20MB 이하만 사용할 수 있습니다.");
    if (!/\.(csv|txt)$/i.test(file.name)) {
      return toast("현재 명단 파일은 CSV 또는 붙여넣기를 이용해 주세요.");
    }
    setValue(await file.text());
    toast("파일을 읽었습니다. 미리보기를 확인한 뒤 적용해 주세요.");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <label className="text-xs font-bold" htmlFor="roster-paste">
          이름 붙여넣기
          <small className="mt-1 block font-normal text-xs text-muted">
            이름만 한 줄에 한 명씩 입력하면 1번부터 자동으로 번호가 붙어요.
          </small>
        </label>
        <textarea
          id="roster-paste"
          className="mt-2 min-h-52 w-full font-mono"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={"김서윤\n김채원\n박새봄"}
        />
        <div className="mt-2 flex justify-end gap-2">
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".csv,.txt"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> CSV 불러오기
          </Button>
          <Button variant="primary" onClick={apply}>
            <Check size={16} /> 번호 자동 설정
          </Button>
        </div>
      </div>
      <div className="min-h-64 rounded-xl border border-line bg-subtle p-6">
        <div className="flex justify-between">
          <b>명단 미리보기</b>
          <span className="text-xs text-muted">{students.length} / 40명</span>
        </div>
        {students.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {students.map((student) => (
              <span
                key={student.id}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs shadow-soft"
              >
                <b className="text-primary">{student.number}</b> {student.name}
                <button
                  aria-label={`${student.name} 삭제`}
                  onClick={() => setStudents(students.filter((item) => item.id !== student.id))}
                  className="grid size-6 place-items-center rounded-md bg-primary-soft text-primary-dark transition-colors duration-150 hover:bg-primary/20"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="grid min-h-32 place-items-center text-xs text-muted">
            명단을 적용하면 여기에 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
