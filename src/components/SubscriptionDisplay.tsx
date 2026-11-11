import { Badge, Card, Text } from "@radix-ui/themes";
import {
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  Hourglass,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import type { Subscription } from "@/types/Subscription";
import "./SubscriptionDisplay.css";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseSubscriptionDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

export function getRemainingDays(expiresAt: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = parseSubscriptionDate(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
}

export function formatBillingCycle(days: number, t: TFunction) {
  const knownCycles: Record<number, string> = {
    7: t("subscriptions.cycle.weekly"),
    30: t("subscriptions.cycle.monthly"),
    90: t("subscriptions.cycle.quarterly"),
    180: t("subscriptions.cycle.semiAnnual"),
    365: t("subscriptions.cycle.annual"),
    [-1]: t("subscriptions.cycle.once"),
  };
  return knownCycles[days] || t("subscriptions.cycle.days", { count: days });
}

export type SubscriptionLifetime = {
  /** 从开通日到今天经过的整天数 */
  days: number;
  /** 开通日期（YYYY/MM/DD） */
  date: string;
  /** 简短文案，如「已存续 1 年 32 天」 */
  label: string;
  /** 悬浮提示 */
  title: string;
};

/** 按自然日拆分为「年 + 天」，满一年才显示年 */
function formatLifetimeDays(days: number, t: TFunction) {
  const years = Math.floor(days / 365);
  const rest = days % 365;
  if (years === 0) return t("subscriptions.lifetimeDays", { count: days });
  if (rest === 0) return t("subscriptions.lifetimeYears", { years });
  return t("subscriptions.lifetimeYearsDays", { years, days: rest });
}

/**
 * 会员存续时长：从开通日（含当天起算）到今天，与服务器的「存续」一致，
 * 不受续费或到期影响。未设置开通时间时返回 null。
 */
export function getSubscriptionLifetime(
  startedAt: string | null | undefined,
  t: TFunction,
): SubscriptionLifetime | null {
  if (!startedAt) return null;
  const start = parseSubscriptionDate(startedAt);
  if (Number.isNaN(start.getTime()) || start.getFullYear() < 1970) return null;
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return null;
  const date = formatSubscriptionDate(startedAt);
  const duration = formatLifetimeDays(days, t);
  const label =
    days === 0 ? t("subscriptions.startedToday") : t("subscriptions.lifetime", { duration });
  return {
    days,
    date,
    label,
    title: t("subscriptions.lifetimeTitle", { date, duration }),
  };
}

export function formatSubscriptionDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parseSubscriptionDate(value));
}

function SubscriptionCard({ item }: { item: Subscription }) {
  const { t } = useTranslation();
  const remainingDays = getRemainingDays(item.expires_at);
  const isExpired = remainingDays < 0;
  const isDueSoon = remainingDays >= 0 && remainingDays <= 7;
  const statusColor = isExpired ? "red" : isDueSoon ? "orange" : "green";
  const statusLabel = isExpired
    ? t("subscriptions.status.expired")
    : isDueSoon
      ? t("subscriptions.status.dueSoon")
      : t("subscriptions.status.active");
  const lifetime = getSubscriptionLifetime(item.started_at, t);
  const remainingLabel = isExpired
    ? t("subscriptions.expiredDays", { count: Math.abs(remainingDays) })
    : remainingDays === 0
      ? t("subscriptions.dueToday")
      : t("subscriptions.remainingDays", { count: remainingDays });

  const priceLabel =
    item.show_price && item.price !== null
      ? `${item.currency}${item.price.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`
      : null;

  const content = (
    <Card className={`subscription-card subscription-card--${statusColor}`}>
      <div className="subscription-card-layout">
        <div className="subscription-card-header">
          <span className="subscription-logo" aria-hidden="true">
            <ReceiptText size={16} strokeWidth={1.8} />
          </span>
          <div className="subscription-title-copy">
            <div className="subscription-name">
              <span className="subscription-name-text" title={item.name}>
                {item.name}
              </span>
              {item.url && (
                <ExternalLink size={12} className="subscription-link-icon" aria-hidden="true" />
              )}
            </div>
            <div className="subscription-subline">
              <span className="subscription-plan">
                {item.plan || t("subscriptions.defaultPlan")}
              </span>
              <span className="subscription-renewal">
                {item.auto_renewal && <RefreshCw size={10} aria-hidden="true" />}
                {item.auto_renewal
                  ? t("subscriptions.autoRenewal")
                  : t("subscriptions.manualRenewal")}
              </span>
            </div>
          </div>
          <div className="subscription-price-block">
            {priceLabel ? (
              <span className="subscription-price">{priceLabel}</span>
            ) : (
              <span className="subscription-price subscription-price--hidden">
                {t("subscriptions.priceHidden")}
              </span>
            )}
            <span className="subscription-cycle">
              {formatBillingCycle(item.billing_cycle, t)}
            </span>
          </div>
        </div>

        {lifetime ? (
          <div className="subscription-lifetime" title={lifetime.title}>
            <span className="subscription-lifetime-item">
              <CalendarPlus size={12} aria-hidden="true" />
              {t("subscriptions.startedAt")}
              <strong>{lifetime.date}</strong>
            </span>
            <span className="subscription-lifetime-item subscription-lifetime-duration">
              <Hourglass size={12} aria-hidden="true" />
              {t("subscriptions.lifetimeLabel")}
              <strong>
                {lifetime.days === 0
                  ? t("subscriptions.startedToday")
                  : formatLifetimeDays(lifetime.days, t)}
              </strong>
            </span>
          </div>
        ) : (
          <div className="subscription-lifetime subscription-lifetime--empty">
            <span className="subscription-lifetime-item">
              <CalendarPlus size={12} aria-hidden="true" />
              {t("subscriptions.startedAt")}
              <strong>{t("subscriptions.startedAtUnset")}</strong>
            </span>
          </div>
        )}

        <div className="subscription-card-footer">
          <span className="subscription-status">
            <span className="subscription-status-dot" aria-hidden="true" />
            {statusLabel}
            <span className="subscription-status-sep" aria-hidden="true">·</span>
            {remainingLabel}
          </span>
          <span className="subscription-expiry">
            <CalendarClock size={12} aria-hidden="true" />
            {formatSubscriptionDate(item.expires_at)}
          </span>
        </div>
      </div>
    </Card>
  );

  if (!item.url) return content;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="subscription-card-link"
      aria-label={t("subscriptions.openService", { name: item.name })}
    >
      {content}
    </a>
  );
}

export default function SubscriptionDisplay({ items }: { items: Subscription[] }) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <section className="subscription-content" aria-label={t("subscriptions.title")}>
      <div className="subscription-content-summary">
        <Text as="div" size="2" color="gray">
          {t("subscriptions.publicDescription")}
        </Text>
        <Badge variant="soft" radius="full">
          {t("subscriptions.count", { count: items.length })}
        </Badge>
      </div>
      <div className="subscription-grid">
        {items.map((item) => (
          <SubscriptionCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
