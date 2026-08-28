// src/prompts/**/*.md 를 TypeScript 모듈로 변환한다.
// Cloud Functions 런타임에서 파일 시스템에 접근하지 않도록, 프롬프트 본문을 코드에 인라인한다.
// npm run build(functions) 및 npm run typecheck(root) 전에 자동 실행된다.
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const promptsDir = fileURLToPath(new URL("../src/prompts/", import.meta.url));
const outDir = path.join(promptsDir, "generated");
const filesDir = path.join(outDir, "files");

/** 프롬프트 경로("elementary/00_core_prompt.md")를 생성 파일명("elementary__00_core_prompt")으로 바꾼다. */
const moduleNameFor = (promptPath) => promptPath.replace(/\.md$/, "").replaceAll("/", "__");

const collectMarkdown = async (dir, prefix = "") => {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (entry.name === "generated") continue;
    const promptPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...(await collectMarkdown(path.join(dir, entry.name), promptPath)));
    } else if (entry.name.endsWith(".md")) {
      found.push(promptPath);
    }
  }
  return found;
};

const promptPaths = (await collectMarkdown(promptsDir)).sort();
if (!promptPaths.length) throw new Error("src/prompts 아래에서 .md 파일을 찾지 못했습니다.");

await rm(outDir, { recursive: true, force: true });
await mkdir(filesDir, { recursive: true });

const header = "// 이 파일은 tools/generate-prompts.mjs 가 생성했습니다. 직접 수정하지 마세요.\n";

let totalBytes = 0;
await Promise.all(
  promptPaths.map(async (promptPath) => {
    const content = await readFile(path.join(promptsDir, promptPath), "utf8");
    totalBytes += Buffer.byteLength(content, "utf8");
    // JSON.stringify 로 감싸면 백틱·${} 등 마크다운 본문의 어떤 문자도 이스케이프 걱정이 없다.
    const body = `${header}\nexport default ${JSON.stringify(content)};\n`;
    await writeFile(path.join(filesDir, `${moduleNameFor(promptPath)}.ts`), body, "utf8");
  }),
);

const union = promptPaths.map((promptPath) => `  | ${JSON.stringify(promptPath)}`).join("\n");
const entries = promptPaths
  .map((promptPath) => `  ${JSON.stringify(promptPath)}: () => import("./files/${moduleNameFor(promptPath)}.js"),`)
  .join("\n");

const indexBody = `${header}
/** src/prompts 아래에 존재하는 모든 마크다운 프롬프트 파일의 경로. */
export type PromptPath =
${union};

/**
 * 프롬프트 파일 경로 → 본문을 담은 모듈의 동적 임포트.
 * 동적 임포트라서 실제로 사용하는 팩의 모듈만 파싱되고, 콜드 스타트 비용이 요청 범위에 비례한다.
 */
export const promptModules: Record<PromptPath, () => Promise<{ default: string }>> = {
${entries}
};

export const promptPaths = Object.keys(promptModules) as PromptPath[];
`;

await writeFile(path.join(outDir, "index.ts"), indexBody, "utf8");

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;
console.log(`프롬프트 ${promptPaths.length}개 모듈 생성 완료 (본문 ${kb(totalBytes)}) → src/prompts/generated/`);
