import { useQueryClient } from "@tanstack/react-query";
import {
  useAddCollectionEntry as useGeneratedAddEntry,
  useRemoveCollectionEntry as useGeneratedRemoveEntry,
  getGetStudentCollectionQueryKey
} from "@workspace/api-client-react";

export function useAddCollectionEntry() {
  const qc = useQueryClient();
  return useGeneratedAddEntry({
    mutation: {
      onSuccess: (data, variables) => {
        qc.invalidateQueries({ queryKey: getGetStudentCollectionQueryKey(variables.studentId) });
      }
    }
  });
}

export function useRemoveCollectionEntry() {
  const qc = useQueryClient();
  return useGeneratedRemoveEntry({
    mutation: {
      onSuccess: (data, variables) => {
        qc.invalidateQueries({ queryKey: getGetStudentCollectionQueryKey(variables.studentId) });
      }
    }
  });
}
