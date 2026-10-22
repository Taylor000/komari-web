import type { Subscription, SubscriptionInput } from "@/types/Subscription";

type ApiResponse<T> = {
  status: string;
  message?: string;
  data: T;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;
  if (!response.ok || !payload || payload.status !== "success") {
    throw new Error(payload?.message || `请求失败 (${response.status})`);
  }
  return payload.data;
}

export const fetchPublicSubscriptions = () =>
  request<Subscription[]>("/api/subscriptions");

export const fetchAdminSubscriptions = () =>
  request<Subscription[]>("/api/admin/subscriptions");

export const createSubscription = (input: SubscriptionInput) =>
  request<Subscription>("/api/admin/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const updateSubscription = (id: number, input: SubscriptionInput) =>
  request<Subscription>(`/api/admin/subscriptions/${id}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const deleteSubscription = (id: number) =>
  request<null>(`/api/admin/subscriptions/${id}/remove`, {
    method: "POST",
  });
