import { expect, test } from "@playwright/test";

const PLAN_PDF = process.env.PLAN_PDF ?? "";

// 실제 학교 평가계획 PDF는 저장소에 넣지 않으므로 경로가 주어질 때만 돈다.
test.skip(!PLAN_PDF, "PLAN_PDF 환경변수로 평가계획 PDF 경로를 지정하면 실행됩니다.");

test("평가계획 PDF를 올리면 성취기준이 자동으로 채워진다", async ({ page }) => {
  await page.goto("/");
  // 학교급 · 역할을 고르는 진입 흐름을 지나 담임의 "우리 반 평어"로 들어간다.
  await page.getByRole("button", { name: "초등학교" }).click();
  await page.getByRole("button", { name: "담임" }).click();
  await page
    .getByRole("navigation", { name: "주요 메뉴" })
    .getByRole("button", { name: "평어" })
    .click();
  await page.getByRole("button", { name: /평가계획 사용/ }).click();

  await page.locator('input[type="file"]').setInputFiles(PLAN_PDF);

  // 분석이 끝나면 평가표에 넣을 성취기준 목록이 0개가 아니어야 한다.
  const counter = page.getByText(/^\d+ \/ \d+개$/);
  await expect(counter).toBeVisible({ timeout: 60_000 });
  await expect(counter).not.toHaveText(/^0 \//);

  await expect(page.getByText("평가계획에서 불러온 성취기준")).toBeVisible();
  await expect(page.getByRole("button", { name: /명단 입력/ })).toBeEnabled();
});
