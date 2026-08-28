import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

const forbiddenIdentity = /(?:[가-힣]{2,4}\s*(?:학생|어린이)|\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\d{6}[- ]?[1-4]\d{6}\b)/iu;
const scriptLike = /<\/?(?:script|iframe|object|embed)|javascript:/iu;

export const assertAuthenticated = (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  return request.auth.uid;
};

export const assertSafeText = (values: string[]) => {
  const joined = values.join(" ");
  if (forbiddenIdentity.test(joined)) throw new HttpsError("invalid-argument", "개인정보 가능성이 있는 내용을 가린 뒤 다시 시도해 주세요.");
  if (scriptLike.test(joined)) throw new HttpsError("invalid-argument", "안전하지 않은 입력이 감지되었습니다.");
};

export const consumeQuota = async (uid: string) => {
  const database = getFirestore();
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);
  const userRef = database.doc(`users/${uid}/usage/${day}`);
  const globalRef = database.doc(`_system/usage/${day}`);
  await database.runTransaction(async (transaction) => {
    const [userSnapshot, globalSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(globalRef)]);
    const user = userSnapshot.data() ?? {};
    const global = globalSnapshot.data() ?? {};
    const minuteCount = user.minuteKey === minute ? Number(user.minuteCount ?? 0) : 0;
    const dailyCount = Number(user.dailyCount ?? 0);
    const globalCount = Number(global.dailyCount ?? 0);
    if (minuteCount >= 8) throw new HttpsError("resource-exhausted", "분당 AI 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
    if (dailyCount >= 250) throw new HttpsError("resource-exhausted", "오늘의 사용자 AI 사용 한도를 초과했습니다.");
    if (globalCount >= Number(process.env.DAILY_GLOBAL_AI_LIMIT ?? 10000)) throw new HttpsError("resource-exhausted", "서비스의 일일 AI 비용 한도에 도달했습니다.");
    transaction.set(userRef, { minuteKey: minute, minuteCount: minuteCount + 1, dailyCount: dailyCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(globalRef, { dailyCount: globalCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
};

