import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { EmailReply, ReplyCreate } from "@/types";

type EntityId = string | number;

export function useReplies(emailId: EntityId) {
  return useQuery<EmailReply[]>({
    queryKey: ["replies", emailId],
    queryFn: async () => {
      const { data } = await api.get(`/api/emails/${emailId}/replies`);
      return data;
    },
    enabled: !!emailId,
  });
}

export function useCreateReply(emailId: EntityId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplyCreate) =>
      api.post<EmailReply>(`/api/emails/${emailId}/replies`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["replies", emailId] });
    },
  });
}

export function useUpdateReply(emailId: EntityId, replyId: EntityId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplyCreate) =>
      api.patch<EmailReply>(`/api/emails/${emailId}/replies/${replyId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["replies", emailId] });
    },
  });
}

export function useSendReply(emailId: EntityId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: EntityId) =>
      api.post<EmailReply>(`/api/emails/${emailId}/replies/${replyId}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["replies", emailId] });
    },
  });
}
