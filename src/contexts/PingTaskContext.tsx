import React from "react";

export interface PingTask {
  clients?: string[];
  default_on?: boolean;
  id?: number;
  interval?: number;
  target?: string;
  type?: string;
  [property: string]: any;
}

interface Response {
  data: PingTask[];
  message: string;
  status: string;
  [property: string]: any;
}

interface PingTaskContextType {
  pingTasks: PingTask[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const PingTaskContext = React.createContext<PingTaskContextType | undefined>(
  undefined
);

export const PingTaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pingTasks, setPingTasks] = React.useState<PingTask[] | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ping");
      if (!response.ok) {
        throw new Error(`Failed to fetch ping tasks (${response.status})`);
      }
      const resp: Response = await response.json();
      if (!Array.isArray(resp?.data)) {
        throw new Error("Invalid ping task response");
      }
      setPingTasks(resp.data);
    } catch (error) {
      setPingTasks([]);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching ping tasks",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PingTaskContext.Provider value={{ pingTasks, isLoading, error, refresh }}>
      {children}
    </PingTaskContext.Provider>
  );
};

export const usePingTask = () => {
  const context = React.useContext(PingTaskContext);
  if (!context) {
    throw new Error("usePingTask must be used within a PingTaskProvider");
  }
  return context;
};
