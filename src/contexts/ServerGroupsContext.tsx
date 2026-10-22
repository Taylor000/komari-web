import * as React from "react";

export type ServerGroup = {
  id: number;
  name: string;
  weight: number;
  client_count: number;
  created_at?: string;
  updated_at?: string;
};

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
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return payload.data;
}

export function fetchServerGroups() {
  return request<ServerGroup[]>("/api/admin/client/group/list");
}

export function createServerGroup(name: string) {
  return request<ServerGroup>("/api/admin/client/group/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function renameServerGroup(id: number, name: string) {
  return request<ServerGroup>(`/api/admin/client/group/${id}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function removeServerGroup(id: number) {
  return request<null>(`/api/admin/client/group/${id}/remove`, {
    method: "POST",
  });
}

export function saveServerGroupOrder(groups: ServerGroup[]) {
  const weights = groups.reduce<Record<string, number>>((result, group, index) => {
    result[String(group.id)] = index;
    return result;
  }, {});
  return request<null>("/api/admin/client/group/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  });
}

type ServerGroupsContextValue = {
  groups: ServerGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setGroups: React.Dispatch<React.SetStateAction<ServerGroup[]>>;
};

const ServerGroupsContext = React.createContext<ServerGroupsContextValue | null>(
  null,
);

export function ServerGroupsProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = React.useState<ServerGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const list = await fetchServerGroups();
      setGroups([...list].sort((a, b) => a.weight - b.weight || a.id - b.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ServerGroupsContext.Provider
      value={{ groups, loading, error, refresh, setGroups }}
    >
      {children}
    </ServerGroupsContext.Provider>
  );
}

export function useServerGroups() {
  const context = React.useContext(ServerGroupsContext);
  if (!context) {
    throw new Error("useServerGroups must be used within ServerGroupsProvider");
  }
  return context;
}
