import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStudent as useGeneratedCreateStudent,
  useUpdateStudent as useGeneratedUpdateStudent,
  useDeleteStudent as useGeneratedDeleteStudent,
  getListStudentsQueryKey,
  getGetStudentQueryKey
} from "@workspace/api-client-react";

export function useCreateStudent() {
  const qc = useQueryClient();
  return useGeneratedCreateStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      }
    }
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useGeneratedUpdateStudent({
    mutation: {
      onSuccess: (data, variables) => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(variables.studentId) });
      }
    }
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useGeneratedDeleteStudent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      }
    }
  });
}
