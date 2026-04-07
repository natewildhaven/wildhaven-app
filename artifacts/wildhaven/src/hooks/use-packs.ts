import { useQueryClient } from "@tanstack/react-query";
import {
  useCreatePack as useGeneratedCreatePack,
  useUpdatePack as useGeneratedUpdatePack,
  useDeletePack as useGeneratedDeletePack,
  useOpenPack as useGeneratedOpenPack,
  getListPacksQueryKey,
  getGetPackQueryKey,
  getGetStudentCollectionQueryKey
} from "@workspace/api-client-react";

export function useCreatePack() {
  const qc = useQueryClient();
  return useGeneratedCreatePack({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPacksQueryKey() })
    }
  });
}

export function useUpdatePack() {
  const qc = useQueryClient();
  return useGeneratedUpdatePack({
    mutation: {
      onSuccess: (data, variables) => {
        qc.invalidateQueries({ queryKey: getListPacksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetPackQueryKey(variables.packId) });
      }
    }
  });
}

export function useDeletePack() {
  const qc = useQueryClient();
  return useGeneratedDeletePack({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPacksQueryKey() })
    }
  });
}

export function useOpenPack() {
  const qc = useQueryClient();
  return useGeneratedOpenPack({
    mutation: {
      onSuccess: (data, variables) => {
        // Invalidate the student's collection so the newly awarded cards appear
        qc.invalidateQueries({ queryKey: getGetStudentCollectionQueryKey(variables.data.studentId) });
      }
    }
  });
}
