export {
  app,
  auth,
  firestore,
  functions,
  isFirebaseConfigured,
  isCloudAiEnabled,
  FUNCTIONS_REGION,
} from "./client";
export { friendlyAuthError, loginWithGoogle, logout, observeUser, type User } from "./auth";
export { loadWorkspace, saveWorkspace } from "./firestore";
export {
  generateSubjectWithAi,
  generateBehaviorWithAi,
  type SubjectAiResult,
  type BehaviorAiResult,
} from "./ai";
