import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleSuspension } from "./suspension-interceptor";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle tenant suspension specifically
    if (res.status === 403) {
      try {
        const errorData = await res.json();
        if (errorData.suspended) {
          console.log("🚫 Tenant suspended - showing modal");
          handleSuspension(errorData.message);
          return;
        }
      } catch (e) {
        // Continue with normal error handling if JSON parsing fails
      }
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle 403 account suspension specifically
    if (res.status === 403) {
      try {
        const errorData = await res.json();
        if (errorData.reason === "suspended") {
          console.log("🚫 Query: Account suspended - redirecting to suspension page");
          window.location.href = "/account-suspended";
          throw new Error(`${res.status}: Account suspended`);
        }
      } catch (e) {
        console.log("403 error in query but couldn't parse JSON:", e);
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
