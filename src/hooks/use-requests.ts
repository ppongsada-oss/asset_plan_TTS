import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
});

export function useCenterRequests(filters: { limit?: number, search?: string, status?: string, type?: string, month?: string, cycleId?: string } = {}) {
  const { limit = 50, search = "", status = "ALL", type = "DEMAND", month = "", cycleId = "" } = filters;

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.data.length) return null; // reached the end
    const query = new URLSearchParams({
      page: (pageIndex + 1).toString(),
      limit: limit.toString(),
      search,
      status,
      type,
      month,
      cycle_id: cycleId
    }).toString();
    return `/api/center/requests?${query}`;
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const requests = data ? data.flatMap((page) => page?.data || []).filter(Boolean) : [];
  const total = data?.[0]?.pagination?.total || 0;
  const isReachingEnd = requests.length >= total;

  return {
    requests,
    isLoading,
    isValidating,
    isError: error,
    size,
    setSize,
    isReachingEnd,
    mutate,
    data,
    counts: data?.[0]?.counts || { demand: 0, return: 0 }
  };
}

export function useCenterAlerts() {
  const { data, error, isLoading, mutate } = useSWR('/api/center/alerts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000, 
  });

  return {
    alerts: data?.success ? data.alerts : [],
    isLoading,
    isError: error,
    mutate,
  };
}
