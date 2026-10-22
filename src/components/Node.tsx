import React from "react";
import {
  Card,
  Flex,
  Text,
  Badge,
  IconButton,
} from "@radix-ui/themes";
import type { LiveData, PingStat, Record } from "../types/LiveData";
import UsageBar from "./UsageBar";
import Flag from "./Flag";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Tips from "./ui/tips";

import { formatBytes, formatUptime } from "@/utils/unitHelper";

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
}
const Node = React.memo(({ basic, live, online }: NodeProps) => {
  const [t] = useTranslation();
  const { publicInfo } = usePublicInfo();
  const defaultLive = {
    cpu: { usage: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
  } as Record;

  const liveData = online && live ? live : defaultLive;

  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;

  const uploadSpeed = formatBytes(liveData.network.up);
  const downloadSpeed = formatBytes(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);
  const cpuName = basic.cpu_name?.trim() || "CPU";
  const cpuCoreLabel = basic.cpu_cores > 0 ? `x${basic.cpu_cores}` : "";
  const cpuDetails = cpuCoreLabel ? `${cpuName} (${cpuCoreLabel})` : cpuName;
  const trafficUsagePercent = getTrafficPercentage(
    liveData.network.totalUp,
    liveData.network.totalDown,
    basic.traffic_limit,
    basic.traffic_limit_type ?? "sum",
  );
  const trafficUsed = getTrafficUsed(
    liveData.network.totalUp,
    liveData.network.totalDown,
    basic.traffic_limit_type ?? "sum",
  );
  const uptime = online ? formatUptime(liveData.uptime, t) : "-";
  const compactUptime = online ? formatCompactUptime(liveData.uptime, t) : "-";
  return (
    <Card
      id={basic.uuid}
      className={`node-card ${online ? "node-card--online" : "node-card--offline"}`}
    >
      <Flex direction="column" gap="2" className="node-card-layout">
        <Flex
          justify="between"
          align="start"
          className="node-card-header"
        >
          <Flex
            justify="start"
            align="center"
            className="node-card-identity"
            style={{ flex: 1, minWidth: 0 }}
          >
            <div className="node-card-flag">
              <Flag flag={basic.region} />
            </div>
            <Link
              to={`/instance/${basic.uuid}`}
              className="node-card-title-link"
              style={{ flex: 1, minWidth: 0 }}
            >
              <Flex direction="column" style={{ minWidth: 0 }}>
                <Text
                  weight="bold"
                  size="3"
                  className="node-card-name"
                  style={{ maxWidth: "100%" }}
                >
                  {basic.name}
                </Text>
              </Flex>
            </Link>
          </Flex>
          <Flex
            gap="2"
            align="center"
            className="node-card-actions"
            style={{ flex: "none" }}
          >
            {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
            <MiniPingChartFloat
              uuid={basic.uuid}
              hours={24}
              trigger={
                <IconButton
                  variant="ghost"
                  size="1"
                  className="node-chart-button"
                  aria-label={t("nodeCard.clickToViewPing")}
                >
                  <TrendingUp size="14" />
                </IconButton>
              }
            />
            <Badge
              color={online ? "green" : "red"}
              variant="soft"
              className="node-status-badge"
            >
              <span className="node-status-dot" aria-hidden="true" />
              {online ? t("nodeCard.online") : t("nodeCard.offline")}
            </Badge>
          </Flex>
        </Flex>

        <div className="node-system-summary">
          <div className="node-system-item node-system-item--uptime">
            <Clock3 size={14} aria-hidden="true" />
            <span className="node-system-label">{t("nodeCard.uptime")}</span>
            <span className="node-system-value" title={uptime}>
              {compactUptime}
            </span>
          </div>
          <div className="node-system-item node-system-item--os">
            <span className="node-system-label">OS</span>
            <span className="node-system-value" title={`${getOSName(basic.os)} / ${basic.arch}`}>
              <img
                src={getOSImage(basic.os)}
                alt=""
                loading="lazy"
                decoding="async"
                className="node-system-os-icon"
              />
              <span className="node-system-os-text">
                {getOSName(basic.os)} / {basic.arch}
              </span>
            </span>
          </div>
        </div>

        <Flex direction="column" gap="2" className="node-card-body">
          <div
            className={`node-resource-grid ${
              basic.traffic_limit > 0 ? "node-resource-grid--with-traffic" : ""
            }`}
          >
            <NodeResourceMetric
              label={t("nodeCard.cpu")}
              value={liveData.cpu.usage}
              detail={cpuCoreLabel || "CPU"}
              title={cpuDetails}
            />
            <NodeResourceMetric
              label={t("nodeCard.ram")}
              value={memoryUsagePercent}
              detail={formatResourceUsage(
                liveData.ram.used,
                basic.mem_total,
                true,
              )}
              title={`${t("nodeCard.ram")}: ${formatResourceUsage(liveData.ram.used, basic.mem_total)}`}
            />
            <NodeResourceMetric
              label={t("nodeCard.disk")}
              value={diskUsagePercent}
              detail={formatResourceUsage(
                liveData.disk.used,
                basic.disk_total,
                true,
              )}
              title={`${t("nodeCard.disk")}: ${formatResourceUsage(liveData.disk.used, basic.disk_total)}`}
            />
            {basic.traffic_limit > 0 && (
              <NodeResourceMetric
                label={t("nodeCard.totalTraffic")}
                value={trafficUsagePercent}
                detail={`${formatBytes(trafficUsed)} / ${formatBytes(basic.traffic_limit)}`}
                title={`${t("nodeCard.totalTraffic")}: ${formatBytes(trafficUsed)} / ${formatBytes(basic.traffic_limit)}`}
              />
            )}
          </div>

          <section
            className="node-network-section"
            aria-label={t("nodeCard.networkTraffic")}
          >
            <div className="node-network-grid">
              <NetworkMetric
                direction="up"
                label={t("nodeCard.networkUploadSpeed")}
                speed={`${uploadSpeed}/s`}
                totalLabel={t("nodeCard.totalUpload")}
                total={totalUpload}
              />
              <NetworkMetric
                direction="down"
                label={t("nodeCard.networkDownloadSpeed")}
                speed={`${downloadSpeed}/s`}
                totalLabel={t("nodeCard.totalDownload")}
                total={totalDownload}
              />
            </div>
          </section>

          <CarrierLossOverview ping={liveData.ping} online={online} />
        </Flex>
        <PriceTags
          className="node-price-tags"
          price={basic.price}
          billing_cycle={basic.billing_cycle}
          expired_at={basic.expired_at}
          auto_renewal={basic.auto_renewal}
          currency={basic.currency}
          tags={basic.tags || ""}
          ip4={
            publicInfo?.theme_settings?.showIpTagsInCard
              ? basic.ipv4
              : undefined
          }
          ip6={
            publicInfo?.theme_settings?.showIpTagsInCard
              ? basic.ipv6
              : undefined
          }
        />
      </Flex>
    </Card>
  );
});

export default Node;

function formatCompactUptime(seconds: number, t: TFunction) {
  if (!Number.isFinite(seconds) || seconds <= 0) return formatUptime(seconds, t);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}${t("nodeCard.time_day")}${hours}${t("nodeCard.time_hour")}`;
  if (hours) return `${hours}${t("nodeCard.time_hour")}${minutes}${t("nodeCard.time_minute")}`;
  return formatUptime(seconds, t);
}

const byteUnits = ["B", "KB", "MB", "GB", "TB", "PB"];

function formatResourceUsage(
  usedBytes: number,
  totalBytes: number,
  compact = false,
) {
  const safeUsed = Number.isFinite(usedBytes) ? Math.max(usedBytes, 0) : 0;
  const safeTotal = Number.isFinite(totalBytes) ? Math.max(totalBytes, 0) : 0;
  const unitBasis = safeTotal || safeUsed;
  const unitIndex = unitBasis
    ? Math.min(
        Math.floor(Math.log(unitBasis) / Math.log(1024)),
        byteUnits.length - 1,
      )
    : 0;
  const divisor = 1024 ** unitIndex;

  const formatValue = (bytes: number) => {
    const size = bytes / divisor;
    if (unitIndex === 0) return Math.round(size).toString();
    if (compact && size >= 100) return Math.round(size).toString();
    const formatted =
      unitIndex >= 2 && bytes >= 1024 ** 3
        ? size.toFixed(2)
        : size > 99.99
          ? size.toFixed(1)
          : size.toFixed(2);
    return compact ? formatted.replace(/\.0+$|(?<=\.[0-9])0$/, "") : formatted;
  };

  const separator = compact ? "/" : " / ";
  const unitSeparator = compact ? "" : " ";
  return `${formatValue(safeUsed)}${separator}${formatValue(safeTotal)}${unitSeparator}${byteUnits[unitIndex]}`;
}

function NodeResourceMetric({
  label,
  value,
  detail,
  title,
}: {
  label: string;
  value: number;
  detail: string;
  title?: string;
}) {
  return (
    <div className="node-resource-metric" title={title}>
      <UsageBar label={label} value={value} />
      <Text as="div" size="1" color="gray" className="node-resource-detail">
        {detail}
      </Text>
    </div>
  );
}

function NetworkMetric({
  direction,
  label,
  speed,
  totalLabel,
  total,
}: {
  direction: "up" | "down";
  label: string;
  speed: string;
  totalLabel: string;
  total: string;
}) {
  const Icon = direction === "up" ? ArrowUp : ArrowDown;

  return (
    <div className={`node-network-metric node-network-metric--${direction}`}>
      <span className="node-network-copy">
        <span className="node-network-label">
          <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          {label}
        </span>
        <strong className="node-network-speed">{speed}</strong>
      </span>
      <span className="node-network-total" title={`${totalLabel}: ${total}`}>
        <span>{totalLabel}</span>
        <strong>{total}</strong>
      </span>
    </div>
  );
}

type CarrierKey = "mobile" | "unicom" | "telecom";

type CarrierLossOverviewProps = {
  ping: { [taskId: string]: PingStat } | undefined;
  online: boolean;
};

const carriers: Array<{
  key: CarrierKey;
  namePattern: RegExp;
}> = [
  { key: "mobile", namePattern: /移动|mobile|cmcc/i },
  { key: "unicom", namePattern: /联通|unicom|cucc/i },
  { key: "telecom", namePattern: /电信|telecom|ctcc/i },
];

const formatLossRate = (loss: number) => {
  if (loss === 0) return "0%";
  if (loss > 0 && loss < 0.1) return "<0.1%";
  return `${loss.toFixed(loss >= 10 ? 0 : 1)}%`;
};

const getLossTone = (loss: number | null, online: boolean) => {
  if (!online || loss === null) return "unavailable";
  if (loss > 5) return "critical";
  if (loss >= 1) return "warning";
  return "good";
};

const CarrierLossOverview = React.memo(
  ({ ping, online }: CarrierLossOverviewProps) => {
    const [t] = useTranslation();
    const stats = Object.values(ping ?? {});

    return (
      <section
        className="node-carrier-loss"
        aria-label={t("nodeCard.carrierLossTitle")}
      >
        <div className="node-section-heading">
          <span>{t("nodeCard.carrierLossTitle")}</span>
          <span className="node-section-meta">
            {t("nodeCard.carrierLossWindow")}
          </span>
        </div>
        <div className="node-carrier-loss-grid">
          {carriers.map(({ key, namePattern }) => {
            const carrierStats = stats.filter(
              (stat) =>
                namePattern.test(stat.name) && Number.isFinite(stat.loss),
            );
            const loss = carrierStats.length
              ? carrierStats.reduce((sum, stat) => sum + stat.loss, 0) /
                carrierStats.length
              : null;
            const tone = getLossTone(loss, online);
            const value = online && loss !== null ? formatLossRate(loss) : "--";
            const label = t(`nodeCard.carrier.${key}`);
            const stateLabel = online
              ? loss === null
                ? t("nodeCard.carrierLossNoData")
                : t("nodeCard.carrierLossValue", { carrier: label, value })
              : t("nodeCard.carrierLossOffline", { carrier: label });

            return (
              <div
                key={key}
                className={`node-carrier-loss-card node-carrier-loss-card--${tone}`}
                role="group"
                aria-label={stateLabel}
                title={`${stateLabel} · ${t("nodeCard.carrierLossWindow")}`}
              >
                <span className="node-carrier-loss-label">
                  <span
                    className="node-carrier-loss-dot"
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span className="node-carrier-loss-value">{value}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  },
);

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
};

import { Box } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import PriceTags from "./PriceTags";
import { ArrowDown, ArrowUp, Clock3, TrendingUp } from "lucide-react";
import MiniPingChartFloat from "./MiniPingChartFloat";
import { getOSImage, getOSName } from "@/utils/osImageHelper";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { compareNodesByAdminOrder } from "@/utils/nodeOrder";
import "./Node.css";
export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  // 确保liveData是有效的
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  const sortedNodes = [...nodes].sort(compareNodesByAdminOrder);

  return (
    <Box className="node-grid">
      {sortedNodes.map((node) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={node.uuid}
            basic={node}
            live={nodeData}
            online={isOnline}
          />
        );
      })}
    </Box>
  );
};

function getTrafficPercentage(
  totalUp: number,
  totalDown: number,
  limit: number,
  type: "max" | "min" | "sum" | "up" | "down",
) {
  if (limit === 0) return 0;
  switch (type) {
    case "max":
      return (Math.max(totalUp, totalDown) / limit) * 100;
    case "min":
      return (Math.min(totalUp, totalDown) / limit) * 100;
    case "sum":
      return ((totalUp + totalDown) / limit) * 100;
    case "up":
      return (totalUp / limit) * 100;
    case "down":
      return (totalDown / limit) * 100;
    default:
      return 0;
  }
}

function getTrafficUsed(
  totalUp: number,
  totalDown: number,
  type: "max" | "min" | "sum" | "up" | "down",
) {
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    case "sum":
    default:
      return totalUp + totalDown;
  }
}
