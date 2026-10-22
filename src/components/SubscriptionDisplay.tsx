import { Badge, Card, Flex, Text } from "@radix-ui/themes";
import {
  CalendarClock,
  ExternalLink,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import type { Subscription } from "@/types/Subscription";
import AutoRenewalBadge from "./AutoRenewalBadge";
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
  const remainingLabel = isExpired
    ? t("subscriptions.expiredDays", { count: Math.abs(remainingDays) })
    : remainingDays === 0
      ? t("subscriptions.dueToday")
      : t("subscriptions.remainingDays", { count: remainingDays });

  const content = (
    <Card className={`subscription-card subscription-card--${statusColor}`}>
      <div className="subscription-card-layout">
        <div className="subscription-card-header">
          <div className="subscription-identity">
            <span className="subscription-logo" aria-hidden="true">
              <ReceiptText size={18} strokeWidth={1.8} />
            </span>
            <div className="subscription-title-copy">
              <Text as="div" size="3" weight="bold" truncate>
                {item.name}
              </Text>
              <Text as="div" size="1" color="gray" truncate>
                {item.plan || t("subscriptions.defaultPlan")}
              </Text>
            </div>
          </div>
          <Flex align="center" gap="2" className="subscription-card-actions">
            <Badge color={statusColor} variant="soft" radius="full">
              <span className="subscription-status-dot" aria-hidden="true" />
              {statusLabel}
            </Badge>
            {item.url && <ExternalLink size={15} className="subscription-link-icon" />}
          </Flex>
        </div>

        <div className="subscription-divider" />

        <div className="subscription-primary-row">
          <div>
            <Text as="div" size="1" color="gray">
              {t("subscriptions.cost")}
            </Text>
            <Text as="div" size="4" weight="bold" className="subscription-price">
              {item.show_price && item.price !== null
                ? `${item.currency}${item.price.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`
                : t("subscriptions.priceHidden")}
            </Text>
          </div>
          <div className="subscription-cycle-pill">
            <RefreshCw size={13} aria-hidden="true" />
            {formatBillingCycle(item.billing_cycle, t)}
          </div>
        </div>

        <div className="subscription-facts">
          <div className="subscription-fact">
            <span>{t("subscriptions.expiresAt")}</span>
            <strong>{formatSubscriptionDate(item.expires_at)}</strong>
          </div>
          <div className="subscription-fact">
            <span>{t("subscriptions.renewal")}</span>
            <strong>
              {item.auto_renewal
                ? t("subscriptions.autoRenewal")
                : t("subscriptions.manualRenewal")}
            </strong>
          </div>
        </div>

        <div className="subscription-card-footer">
          <span className="subscription-remaining">
            <CalendarClock size={15} aria-hidden="true" />
            {remainingLabel}
          </span>
          <AutoRenewalBadge enabled={item.auto_renewal} />
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
