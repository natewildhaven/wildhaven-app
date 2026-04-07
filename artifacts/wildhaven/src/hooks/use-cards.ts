import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCard as useGeneratedCreateCard,
  useUpdateCard as useGeneratedUpdateCard,
  useDeleteCard as useGeneratedDeleteCard,
  getListCardsQueryKey,
  getGetPackQueryKey
} from "@workspace/api-client-react";

export function useCreateCard() {
  const qc = useQueryClient();
  return useGeneratedCreateCard({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListCardsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPackQueryKey(data.packId) });
      }
    }
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useGeneratedUpdateCard({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getListCardsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPackQueryKey(data.packId) });
      }
    }
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useGeneratedDeleteCard({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCardsQueryKey() });
        // Can't reliably know packId here without caching, so invalidate all packs or rely on refetch
      }
    }
  });
}
