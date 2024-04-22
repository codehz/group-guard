import type { SWRResponse } from "swr";
import { useLoading } from "../components/LoadingContext";
import { useToastMessage } from "../components/ToastManager";
import { useTruthyEffect } from "./useTruthyEffect";

export function useDataFetched<T>({ data, error, isLoading }: SWRResponse<T>) {
  useLoading(isLoading);
  const toast = useToastMessage();
  useTruthyEffect(error, (error) => {
    toast(error + "", 10 * 1000);
  });
  return data;
}
