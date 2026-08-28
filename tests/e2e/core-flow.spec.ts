import { test, expect } from "@playwright/test";

test("평어 빠른 생성과 근거 확인", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "초등학교" }).click();
  await page.getByRole("button", { name: "전담과목" }).click();
  await page.getByRole("button", { name: /직접 설정/ }).click();
  await page.getByRole("button", { name: /평어 생성/ }).click();
  await expect(page.getByText("생성 결과")).toBeVisible();
  await page.getByText(/근거 보기/).first().click();
  await expect(page.getByText("공식 A 수준").first()).toBeVisible();
});

test("우리 반 명단과 평가표", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "초등학교" }).click();
  await page.getByRole("button", { name: "담임" }).click();
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("button", { name: "평어" }).click();
  await page.getByRole("button", { name: /직접 설정/ }).click();
  await page.getByRole("button", { name: /성취기준 추가/ }).click();
  await page.getByRole("button", { name: /명단 입력으로/ }).click();
  await page.getByRole("button", { name: /번호 자동 설정/ }).click();
  await expect(page.getByText("김하늘")).toBeVisible();
  await page.getByRole("button", { name: /평가 입력으로/ }).click();
  await expect(page.getByRole("table")).toBeVisible();
});
