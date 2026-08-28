import { describe, expect, it } from "vitest";
import { navItemsFor } from "@/components/layout/nav";

describe("역할별 사이드바 메뉴", () => {
  it("초등 전담과목은 평어에만 접근한다", () => {
    expect(navItemsFor("elementary", "subject").map(({ id, label }) => [id, label])).toEqual([
      ["subject", "평어"],
    ]);
  });

  it("담임은 행발과 평어를 모두 사용한다", () => {
    expect(navItemsFor("elementary", "homeroom").map(({ id, label }) => [id, label])).toEqual([
      ["behavior", "행발"],
      ["subject", "평어"],
    ]);
  });
});
