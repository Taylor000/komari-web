/**
 * 成本统计：把不同计费周期、不同币种的价格统一折算成人民币月/年成本。
 */

export type CostItem = {
  price: number | null | undefined;
  billing_cycle: number | null | undefined;
  currency: string | null | undefined;
};

/** 1 单位外币 = N 人民币。实时汇率获取失败时使用。 */
const FALLBACK_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.1,
  EUR: 8.2,
  GBP: 9.4,
  JPY: 0.047,
  HKD: 0.91,
  TWD: 0.22,
  SGD: 5.5,
  KRW: 0.0051,
  CAD: 5.1,
  AUD: 4.6,
  RUB: 0.088,
};

const SYMBOL_TO_CODE: Record<string, string> = {
  "¥": "CNY",
  "￥": "CNY",
  "元": "CNY",
  RMB: "CNY",
  CNY: "CNY",
  "$": "USD",
  US$: "USD",
  USD: "USD",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
  "円": "JPY",
  JPY: "JPY",
  HK$: "HKD",
  HKD: "HKD",
  NT$: "TWD",
  TWD: "TWD",
  S$: "SGD",
  SGD: "SGD",
  "₩": "KRW",
  KRW: "KRW",
  C$: "CAD",
  CAD: "CAD",
  A$: "AUD",
  AUD: "AUD",
  "₽": "RUB",
  RUB: "RUB",
};

export function currencyCode(currency: string | null | undefined): string {
  const key = (currency ?? "").trim();
  if (!key) return "CNY";
  return SYMBOL_TO_CODE[key] ?? SYMBOL_TO_CODE[key.toUpperCase()] ?? key.toUpperCase();
}

/** 计费周期（天）折算为月数，与 formatBillingCycle 的区间保持一致。 */
function cycleMonths(days: number): number {
  if (days >= 27 && days <= 32) return 1;
  if (days >= 87 && days <= 95) return 3;
  if (days >= 175 && days <= 185) return 6;
  if (days >= 360 && days <= 370) return 12;
  if (days >= 720 && days <= 750) return 24;
  if (days >= 1080 && days <= 1150) return 36;
  if (days >= 1800 && days <= 1850) return 60;
  return days / (365 / 12);
}

export type CostSummary = {
  monthly: number;
  yearly: number;
  /** 参与统计的条目数 */
  count: number;
  /** 汇率表里找不到的币种 */
  unknownCurrencies: string[];
};

/**
 * 汇总月/年成本（人民币）。价格为 0/-1（未设置/免费）、一次性付费
 * （billing_cycle = -1）或周期无效的条目不计入。
 */
export function summarizeCost(
  items: CostItem[],
  rates: Record<string, number>,
): CostSummary {
  let monthly = 0;
  let count = 0;
  const unknown = new Set<string>();
  for (const item of items) {
    const price = Number(item.price);
    const cycle = Number(item.billing_cycle);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(cycle) || cycle <= 0) continue;
    const code = currencyCode(item.currency);
    const rate = rates[code] ?? FALLBACK_RATES[code];
    if (!rate) {
      unknown.add(item.currency || code);
      continue;
    }
    monthly += (price * rate) / cycleMonths(cycle);
    count++;
  }
  return {
    monthly,
    yearly: monthly * 12,
    count,
    unknownCurrencies: [...unknown],
  };
}

export function formatCny(value: number): string {
  // 不加千分位；≥1000 取整，其余最多保留两位小数
  const rounded = value >= 1000 ? Math.round(value) : Math.round(value * 100) / 100;
  return `¥${rounded}`;
}

const RATE_CACHE_KEY = "costExchangeRatesCNY";
const RATE_CACHE_TTL = 12 * 60 * 60 * 1000;

export type RateTable = {
  rates: Record<string, number>;
  live: boolean;
  updatedAt: number | null;
};

export const fallbackRateTable: RateTable = {
  rates: FALLBACK_RATES,
  live: false,
  updatedAt: null,
};

/**
 * 获取以人民币为基准的实时汇率（缓存 12 小时），失败时返回内置汇率。
 */
export async function loadRates(): Promise<RateTable> {
  try {
    const cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || "null");
    if (cached?.rates && Date.now() - cached.updatedAt < RATE_CACHE_TTL) {
      return { rates: cached.rates, live: true, updatedAt: cached.updatedAt };
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/CNY");
    const data = await res.json();
    if (data?.result !== "success" || !data.rates) throw new Error("bad rates");
    // 接口返回 1 CNY = x 外币，这里取倒数得到 1 外币 = N CNY
    const rates: Record<string, number> = { CNY: 1 };
    for (const [code, value] of Object.entries(data.rates)) {
      const n = Number(value);
      if (n > 0) rates[code] = 1 / n;
    }
    const table = { rates, live: true, updatedAt: Date.now() };
    try {
      localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(table));
    } catch {
      /* ignore */
    }
    return table;
  } catch {
    return fallbackRateTable;
  }
}
