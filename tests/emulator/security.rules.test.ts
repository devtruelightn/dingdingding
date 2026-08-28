import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getBytes } from "firebase/storage";

let environment: RulesTestEnvironment;
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-pyeonghaeng-toktok",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});
afterAll(async () => environment.cleanup());

describe("Firestore 사용자 격리", () => {
  const workspace = { ownerUid: "user-a", title: "3학년 1학기", type: "class-subject", academicYear: 2026, semester: 1, grade: 3, classLabel: "1반", privacyMode: true, schemaVersion: 1, createdAt: new Date(), updatedAt: new Date() };
  it("비로그인 접근을 거부한다", async () => assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "users/user-a/workspaces/w1"))));
  it("본인 생성은 허용하고 IDOR를 차단한다", async () => {
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("user-a").firestore(), "users/user-a/workspaces/w1"), workspace));
    await assertFails(getDoc(doc(environment.authenticatedContext("user-b").firestore(), "users/user-a/workspaces/w1")));
    await assertFails(setDoc(doc(environment.authenticatedContext("user-b").firestore(), "users/user-a/workspaces/w2"), { ...workspace, ownerUid: "user-b" }));
  });
  it("허용되지 않은 필드와 긴 문장을 거부한다", async () => {
    await assertFails(setDoc(doc(environment.authenticatedContext("user-a").firestore(), "users/user-a/workspaces/w3"), { ...workspace, secret: "x" }));
    await assertFails(setDoc(doc(environment.authenticatedContext("user-a").firestore(), "users/user-a/workspaces/w4/generatedTexts/t1"), { ownerUid: "user-a", anonymousStudentId: "s1", type: "subject", sentence: "가".repeat(9000), standardIds: ["2국01-01"], officialLevel: "A", schoolLevel: "잘함", grounded: true, needsReview: false, reviewReason: "", locked: false, confirmed: false, edited: false, promptVersion: "v1", createdAt: new Date(), updatedAt: new Date() }));
  });
});

describe("Storage 사용자 격리", () => {
  it("본인 PDF만 업로드하고 다른 사용자는 읽지 못한다", async () => {
    const ownerStorage = environment.authenticatedContext("user-a").storage();
    const path = ref(ownerStorage, "users/user-a/uploads/plan.pdf");
    await assertSucceeds(uploadBytes(path, new Uint8Array([0x25,0x50,0x44,0x46]), { contentType: "application/pdf", customMetadata: { ownerUid: "user-a" } }));
    await expect(assertFails(getBytes(ref(environment.authenticatedContext("user-b").storage(), "users/user-a/uploads/plan.pdf")))).resolves.toBeUndefined();
  });
  it("HTML과 과대 파일 메타데이터를 거부한다", async () => {
    const path = ref(environment.authenticatedContext("user-a").storage(), "users/user-a/uploads/attack.html");
    await assertFails(uploadBytes(path, new TextEncoder().encode("<script>"), { contentType: "text/html", customMetadata: { ownerUid: "user-a" } }));
  });
});

