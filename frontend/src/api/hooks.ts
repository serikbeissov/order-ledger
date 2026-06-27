import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ensureCsrf } from "./client";
import type {
  ClientDetail,
  ClientListItem,
  Dashboard,
  Expense,
  ExpenseCategory,
  Group,
  Investment,
  Investor,
  OrderDetail,
  OrderListItem,
  Paginated,
  PermissionCatalogEntry,
  RecurringDueItem,
  RecurringExpense,
  Reserve,
  UserAccount,
  WarehouseItem,
} from "./types";

// --- утилиты -----------------------------------------------------------------
async function getList<T>(url: string, params?: object): Promise<Paginated<T>> {
  const r = await api.get<Paginated<T>>(url, { params });
  return r.data;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  await ensureCsrf();
  const r = await api.post<T>(url, body);
  return r.data;
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  await ensureCsrf();
  const r = await api.patch<T>(url, body);
  return r.data;
}

async function del(url: string): Promise<void> {
  await ensureCsrf();
  await api.delete(url);
}

// --- клиенты -----------------------------------------------------------------
export function useClients(search?: string) {
  return useQuery({
    queryKey: ["clients", search],
    queryFn: () => getList<ClientListItem>("/clients/", { search }),
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => (await api.get<ClientDetail>(`/clients/${id}/`)).data,
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ClientDetail>) => post<ClientDetail>("/clients/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch<ClientDetail>(`/clients/${id}/`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["client", v.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useAddMovement(clientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      post(`/clients/${clientId}/movements/`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// --- заказы ------------------------------------------------------------------
export function useOrders(params?: { client?: number; search?: string }) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => getList<OrderListItem>("/orders/", params),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get<OrderDetail>(`/orders/${id}/`)).data,
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { client: number; notes?: string }) =>
      post<OrderDetail>("/orders/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch<OrderDetail>(`/orders/${id}/`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["order", v.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOrderAction(orderId: number) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order", orderId] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  };
  return {
    addItem: useMutation({
      mutationFn: (body: unknown) => post(`/orders/${orderId}/items/`, body),
      onSuccess: invalidate,
    }),
    updateItem: useMutation({
      mutationFn: ({ iid, ...body }: { iid: number } & Record<string, unknown>) =>
        patch(`/orders/${orderId}/items/${iid}/`, body),
      onSuccess: invalidate,
    }),
    addExpense: useMutation({
      mutationFn: (body: unknown) => post(`/orders/${orderId}/expenses/`, body),
      onSuccess: invalidate,
    }),
    issue: useMutation({
      mutationFn: ({ iid, issued_qty }: { iid: number; issued_qty: number }) =>
        post(`/orders/${orderId}/items/${iid}/issue/`, { issued_qty }),
      onSuccess: invalidate,
    }),
    addReturn: useMutation({
      mutationFn: ({ iid, ...body }: { iid: number } & Record<string, unknown>) =>
        post(`/orders/${orderId}/items/${iid}/returns/`, body),
      onSuccess: invalidate,
    }),
  };
}

// --- склад -------------------------------------------------------------------
export function useWarehouse() {
  return useQuery({
    queryKey: ["warehouse"],
    queryFn: () => getList<WarehouseItem>("/warehouse/"),
  });
}

export function useCreateWarehouseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<WarehouseItem>) =>
      post<WarehouseItem>("/warehouse/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouse"] }),
  });
}

export function useUpdateWarehouseItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch<WarehouseItem>(`/warehouse/${id}/`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouse"] }),
  });
}

// --- расходы -----------------------------------------------------------------
export function useExpenses(params?: object) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => getList<Expense>("/expenses/", params),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => getList<ExpenseCategory>("/expense-categories/"),
  });
}

export function useRecurringDue(period: string) {
  return useQuery({
    queryKey: ["recurring-due", period],
    queryFn: async () =>
      (
        await api.get<{ period: string; due: RecurringDueItem[] }>(
          "/expenses/recurring_due/",
          { params: { period } },
        )
      ).data,
    retry: false,
  });
}

// --- ежемесячные напоминания (шаблоны) ---------------------------------------
export function useRecurringExpenses() {
  return useQuery({
    queryKey: ["recurring-expenses"],
    queryFn: () => getList<RecurringExpense>("/recurring-expenses/"),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<RecurringExpense>) =>
      post<RecurringExpense>("/recurring-expenses/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-expenses"] });
      qc.invalidateQueries({ queryKey: ["recurring-due"] });
    },
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch<RecurringExpense>(`/recurring-expenses/${id}/`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-expenses"] });
      qc.invalidateQueries({ queryKey: ["recurring-due"] });
    },
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/recurring-expenses/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recurring-expenses"] });
      qc.invalidateQueries({ queryKey: ["recurring-due"] });
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Expense>) => post<Expense>("/expenses/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["recurring-due"] });
    },
  });
}

// --- инвестиции --------------------------------------------------------------
export function useInvestors() {
  return useQuery({
    queryKey: ["investors"],
    queryFn: () => getList<Investor>("/investors/"),
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: ["investments"],
    queryFn: () => getList<Investment>("/investments/"),
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Investment>) =>
      post<Investment>("/investments/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["investors"] });
    },
  });
}

export function useCreateInvestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Investor>) => post<Investor>("/investors/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["investors"] }),
  });
}

// --- резервы -----------------------------------------------------------------
export function useReserves() {
  return useQuery({
    queryKey: ["reserves"],
    queryFn: () => getList<Reserve>("/reserves/"),
  });
}

export function useCreateReserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Reserve>) => post<Reserve>("/reserves/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reserves"] }),
  });
}

export function useReserveMovement(reserveId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      post(`/reserves/${reserveId}/movements/`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reserves"] }),
  });
}

// --- дашборд -----------------------------------------------------------------
export function useDashboard(period: string) {
  return useQuery({
    queryKey: ["dashboard", period],
    queryFn: async () =>
      (await api.get<Dashboard>("/dashboard/", { params: { period } })).data,
  });
}

// --- пользователи ------------------------------------------------------------
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => getList<UserAccount>("/users/"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => post("/users/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch(`/users/${id}/`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// --- роли (группы) и каталог прав --------------------------------------------
export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => getList<Group>("/groups/"),
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () =>
      (await api.get<PermissionCatalogEntry[]>("/permissions/")).data,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; permission_ids?: number[] }) =>
      post<Group>("/groups/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Record<string, unknown>) =>
      patch<Group>(`/groups/${id}/`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
