
import axios from "axios";

const api = axios.create({
  baseURL: "https://k12-educational-intelligence.onrender.com",

  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


export type ApiConversation = {
  conversation_id: string;
  user_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ApiMessage = {
  message_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type ChatResponse = {
  thread_id: string;
  query: string;
  response: string;
  events: Array<Record<string, unknown>>;
  search_results: Array<Record<string, unknown>>;
};


export async function signUp(
  name: string,
  email: string,
  password: string,
) {
  const response = await api.post("/signup", {
    name: name,
    email: email,
    password: password,
  });

  return response.data;
}

export async function verifyEmail(
  email: string,
  otp: string
) {

  const response = await api.post("/signup/verify-otp", {
    email: email,
    otp: otp
  })

  return response.data
}

export async function login(
  email: string,
  password: string,
) {
  const response = await api.post("/login", {
    email,
    password,
  });

  return response.data;
}

export type AuthUser = {
  user_id: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function logout() {
  const { data } = await api.post("/auth/logout");
  return data;
}


export async function sendMessage(
  threadId: string,
  message: string
): Promise<ChatResponse> {

  const { data } = await api.post<ChatResponse>("/chat", {
    thread_id: threadId,
    message,
  });

  return data;
}

export async function getConversations() {
  const { data } = await api.get<ApiConversation[]>(
    "/get-conversations",
  );

  return data;
}

export async function getConversation(threadId: string) {
  const { data } = await api.get<
    ApiConversation & { messages: ApiMessage[] }
  >(`/get-conversation/${encodeURIComponent(threadId)}`);

  return data;
}

export async function deleteConversation(threadId: string) {
  const { data } = await api.delete(
    `/get-conversation/${encodeURIComponent(threadId)}`,
  );

  return data;
}
