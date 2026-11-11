import type { TFunction } from "i18next";
import { formatPurchaseDate, formatUptime, getLifetimeSeconds } from "./unitHelper";

type LifetimeNode = {
  purchased_at?: string | null;
  created_at?: string | null;
};

type LifetimeSettings = { [key: string]: unknown } | undefined | null;

export type Lifetime = {
  seconds: number;
  /** "purchased": 后台设置的购买时间；"created": 回退为加入面板的时间 */
  source: "purchased" | "created";
  /** 完整的悬浮提示 */
  title: string;
};

/** 主题设置里的开关：缺省视为开启。 */
const enabled = (settings: LifetimeSettings, key: string) =>
  settings?.[key] !== false;

/**
 * 计算存续时长（从购买时间起算，不受重启影响）。
 * 未设置购买时间时，按主题设置回退到加入面板的时间。
 */
export function resolveLifetime(
  node: LifetimeNode | undefined,
  settings: LifetimeSettings,
  t: TFunction,
): Lifetime | null {
  if (!node || !enabled(settings, "showLifetimeInCard")) return null;

  const purchased = getLifetimeSeconds(node.purchased_at);
  if (purchased !== null && node.purchased_at) {
    return {
      seconds: purchased,
      source: "purchased",
      title: t("nodeCard.lifetimeTitle", {
        duration: formatUptime(purchased, t),
        date: formatPurchaseDate(node.purchased_at),
      }),
    };
  }

  if (!enabled(settings, "lifetimeFallbackToCreatedAt")) return null;
  const created = getLifetimeSeconds(node.created_at);
  if (created !== null && node.created_at) {
    return {
      seconds: created,
      source: "created",
      title: t("nodeCard.lifetimeTitleCreated", {
        duration: formatUptime(created, t),
        date: formatPurchaseDate(node.created_at),
      }),
    };
  }
  return null;
}
