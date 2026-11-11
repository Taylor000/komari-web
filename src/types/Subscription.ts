export type Subscription = {
  id: number;
  name: string;
  plan: string;
  price: number | null;
  currency: string;
  billing_cycle: number;
  expires_at: string;
  /** 开通时间，未设置为 null；用于计算存续时长 */
  started_at?: string | null;
  auto_renewal: boolean;
  visible?: boolean;
  show_price: boolean;
  url: string;
  remark: string;
  weight: number;
  created_at?: string;
  updated_at?: string;
};

export type SubscriptionInput = Omit<
  Subscription,
  "id" | "weight" | "created_at" | "updated_at"
> & { price: number; visible: boolean };
