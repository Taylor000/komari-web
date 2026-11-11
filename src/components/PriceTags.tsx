import { Badge, Flex } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import AutoRenewalBadge from "./AutoRenewalBadge";

/** 计费周期（天）→ "月" / "年" / "N 天" 等 */
export function formatBillingCycle(billingCycle: number, t: TFunction) {
  if (billingCycle >= 27 && billingCycle <= 32) return t("common.monthly");
  if (billingCycle >= 87 && billingCycle <= 95) return t("common.quarterly");
  if (billingCycle >= 175 && billingCycle <= 185) return t("common.semi_annual");
  if (billingCycle >= 360 && billingCycle <= 370) return t("common.annual");
  if (billingCycle >= 720 && billingCycle <= 750) return t("common.biennial");
  if (billingCycle >= 1080 && billingCycle <= 1150) return t("common.triennial");
  if (billingCycle >= 1800 && billingCycle <= 1850) return t("common.quinquennial");
  if (billingCycle == -1) return t("common.once");
  return `${billingCycle} ${t("nodeCard.time_day")}`;
}

/** 到期信息：剩余天数文案与提醒等级 */
export function getExpiryInfo(expiredAt: string | number, t: TFunction) {
  const diffTime = new Date(expiredAt).getTime() - Date.now();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const level: "normal" | "warning" | "critical" =
    days <= 7 ? "critical" : days <= 15 ? "warning" : "normal";
  const color = level === "critical" ? "red" : level === "warning" ? "orange" : "gray";
  const label =
    days <= 0
      ? t("common.expired")
      : days > 36500
        ? t("common.long_term")
        : t("common.expired_in", { days });
  return { days, level, color, label } as const;
}

const tagColors = [
  "ruby", "gray", "gold", "bronze", "brown", "yellow", "amber", "orange",
  "tomato", "red", "crimson", "pink", "plum", "purple", "violet", "iris",
  "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint",
  "sky",
] as const;
export type TagColor = (typeof tagColors)[number];

/** 解析 "a;b<red>;c" 形式的自定义标签 */
export function parseCustomTags(tags?: string) {
  if (!tags) return [];
  return tags
    .split(";")
    .filter((tag) => tag.trim() !== "")
    .map((tag) => {
      const colorMatch = tag.match(/<(\w+)>$/);
      if (colorMatch) {
        const color = colorMatch[1].toLowerCase();
        if ((tagColors as readonly string[]).includes(color)) {
          return { text: tag.replace(/<\w+>$/, ""), color: color as TagColor };
        }
      }
      return { text: tag, color: null as TagColor | null };
    });
}

const PriceTags = ({
  price = 0,
  billing_cycle = 30,
  currency = "￥",
  expired_at = Date.now() + 30 * 24 * 60 * 60 * 1000,
  auto_renewal,
  tags = "",
  ip4 = "",
  ip6 = "",
  ...props
}: {
  expired_at?: string | number;
  price?: number;
  billing_cycle?: number;
  auto_renewal?: boolean;
  currency?: string;
  tags?: string;
  ip4?: any;
  ip6?: any;
} & React.ComponentProps<typeof Flex>) => {
  const [t] = useTranslation();
  const renewalBadge = auto_renewal === undefined
    ? null
    : <AutoRenewalBadge enabled={auto_renewal} />;

  if (price == 0) {
    return (
      <Flex gap="1" {...props} wrap="wrap">
        {renewalBadge}
        <CustomTags tags={tags} />
      </Flex>
    );
  }
  return (
    <Flex gap="1" {...props} wrap="wrap">
      {ip4 && (
        <Badge size="1" variant="soft" className="text-sm" color="gray">
          <label className="flex justify-center items-center gap-1 text-xs">
            <div className="border-2 rounded-4xl border-gray-500"></div>
            V4
          </label>
        </Badge>
      )}

      {ip6 && (
        <Badge size="1" variant="soft" className="text-sm" color="gray">
          <label className="flex justify-center items-center gap-1 text-xs">
            <div className="border-2 rounded-4xl border-gray-500"></div>
            V6
          </label>
        </Badge>
      )}

      <Badge color="gray" size="1" variant="soft" className="text-sm">
        <label className="text-xs">
          {price == -1 ? t("common.free") : `${currency}${price}`}/
          {formatBillingCycle(billing_cycle, t)}
        </label>
      </Badge>
      <Badge
        color={getExpiryInfo(expired_at, t).color}
        size="1"
        variant="soft"
        className="text-sm"
      >
        <label className="text-xs">
          {getExpiryInfo(expired_at, t).label}
        </label>
      </Badge>
      {renewalBadge}
      <CustomTags tags={tags} />
    </Flex>
  );
};

const CustomTags = ({ tags }: { tags?: string }) => {
  if (!tags || tags.trim() === "") {
    return <></>;
  }
  return (
    <>
      {parseCustomTags(tags).map(({ text, color }, index) => {
        const badgeColor = color || "gray";

        return (
          <Badge
            key={index}
            color={badgeColor}
            variant="soft"
            className="text-sm"
          >
            <label className="text-xs">{text}</label>
          </Badge>
        );
      })}
    </>
  );
};

export default PriceTags;
