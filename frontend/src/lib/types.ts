// API response shapes — mirror the backend Pydantic *Response schemas.

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: number;
  user_id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string | null;
  date: string;
  is_recurring: boolean;
  recurring_interval: string | null;
  currency: string;
  created_at: string;
};

export type BudgetStatus = "acceptable" | "caution" | "warning" | "exceeded";

export type Budget = {
  id: number;
  user_id: string;
  category: string;
  limit: number;
  period: string;
  currency: string;
  spent: number;
  percentage: number;
  status: BudgetStatus;
  period_start: string;
  period_end: string;
};

export type Goal = {
  id: number;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  currency: string;
};

export type Category = {
  id: number;
  user_id: string;
  name: string;
  emoji: string;
};
