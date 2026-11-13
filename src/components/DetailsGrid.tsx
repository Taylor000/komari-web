import { useTranslation } from "react-i18next";
import type { ComponentType, ReactNode } from "react";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatBytes, formatUptime } from "@/utils/unitHelper";
import { resolveLifetime } from "@/utils/lifetime";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { getOSImage } from "@/utils/osImageHelper";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock3,
  Cpu,
  Gauge,
} from "lucide-react";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  box?: boolean;
  align?: "start" | "center" | "end";
};

const toPercent = (used: number | undefined, total: number | undefined) =>
  total && total > 0 ? Math.min(Math.max(((used ?? 0) / total) * 100, 0), 100) : 0;

export const DetailsGrid = ({ uuid, box }: DetailsGridProps) => {
  const { t } = useTranslation();

  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const { publicInfo } = usePublicInfo();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const liveRecord = live_data?.data.data[uuid];
  const lifetime = resolveLifetime(node, publicInfo?.theme_settings, t);
  const unknown = "Unknown";

  const memTotal = node?.mem_total || 0;
  const swapTotal = node?.swap_total || 0;
  const diskTotal = node?.disk_total || 0;
  const load = liveRecord?.load;
  const lastUpdated =
    liveRecord?.updated_at || node?.updated_at
      ? new Date(
          (liveRecord?.updated_at || node?.updated_at) as string,
        ).toLocaleString()
      : "-";

  const specs: Array<{ label: string; value: ReactNode; note?: string }> = [
    {
      label: "CPU",
      value: node?.cpu_name || unknown,
      note: node?.cpu_cores
        ? t("nodeCard.cores", { count: node.cpu_cores })
        : undefined,
    },
    // 没有 GPU 的机器不显示这一行，避免一行无意义的 Unknown
    ...(node?.gpu_name && !/^(none|unknown|n\/a)$/i.test(node.gpu_name.trim())
      ? [{ label: "GPU", value: node.gpu_name }]
      : []),
    { label: t("nodeCard.ram"), value: formatBytes(memTotal) },
    { label: t("nodeCard.swap"), value: formatBytes(swapTotal) },
    { label: t("nodeCard.disk"), value: formatBytes(diskTotal) },
    {
      label: t("nodeCard.os"),
      value: (
        <span className="details-spec-os">
          {node?.os && (
            <img
              src={getOSImage(node.os)}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          {node?.os || unknown}
        </span>
      ),
    },
    { label: t("nodeCard.kernelVersion"), value: node?.kernel_version || unknown },
    { label: t("nodeCard.arch"), value: node?.arch || unknown },
    { label: t("nodeCard.virtualization"), value: node?.virtualization || unknown },
  ];

  return (
    <div
      className={`DetailsGrid details-layout${box ? " details-layout--boxed" : ""}`}
    >
      <section
        className="details-panel details-panel--live"
        aria-label={t("nodeCard.monitoring")}
      >
        <PanelTitle
          icon={Activity}
          meta={`${t("nodeCard.last_updated")} ${lastUpdated}`}
        >
          {t("nodeCard.liveStatus")}
        </PanelTitle>

        <div className="details-meter-grid">
          <Meter
            label="CPU"
            percent={liveRecord?.cpu.usage ?? 0}
            detail={
              node?.cpu_cores
                ? t("nodeCard.cores", { count: node.cpu_cores })
                : "-"
            }
          />
          <Meter
            label={t("nodeCard.ram")}
            percent={toPercent(liveRecord?.ram.used, memTotal)}
            detail={`${formatBytes(liveRecord?.ram.used || 0)} / ${formatBytes(memTotal)}`}
          />
          <Meter
            label={t("nodeCard.swap")}
            percent={toPercent(liveRecord?.swap.used, swapTotal)}
            detail={
              swapTotal
                ? `${formatBytes(liveRecord?.swap.used || 0)} / ${formatBytes(swapTotal)}`
                : formatBytes(0)
            }
            muted={!swapTotal}
          />
          <Meter
            label={t("nodeCard.disk")}
            percent={toPercent(liveRecord?.disk.used, diskTotal)}
            detail={`${formatBytes(liveRecord?.disk.used || 0)} / ${formatBytes(diskTotal)}`}
          />
        </div>

        <div className="details-stat-grid">
          <LiveStat
            tone="up"
            icon={ArrowUp}
            label={t("nodeCard.networkUploadSpeed")}
            value={`${formatBytes(liveRecord?.network.up || 0)}/s`}
            note={`${t("nodeCard.totalUpload")} ${formatBytes(liveRecord?.network.totalUp || 0)}`}
          />
          <LiveStat
            tone="down"
            icon={ArrowDown}
            label={t("nodeCard.networkDownloadSpeed")}
            value={`${formatBytes(liveRecord?.network.down || 0)}/s`}
            note={`${t("nodeCard.totalDownload")} ${formatBytes(liveRecord?.network.totalDown || 0)}`}
          />
          <LiveStat
            tone="load"
            icon={Gauge}
            label={t("nodeCard.load")}
            value={load ? load.load1.toFixed(2) : "-"}
            note={
              load
                ? `5m ${load.load5.toFixed(2)} · 15m ${load.load15.toFixed(2)}`
                : undefined
            }
          />
          <LiveStat
            tone="uptime"
            icon={Clock3}
            label={t("nodeCard.uptime")}
            value={
              liveRecord?.uptime ? formatUptime(liveRecord.uptime, t) : "-"
            }
            note={
              lifetime
                ? t("nodeCard.lifetimeNote", {
                    duration: formatUptime(lifetime.seconds, t),
                  })
                : undefined
            }
            title={lifetime?.title}
          />
        </div>
      </section>

      <section className="details-panel details-panel--spec">
        <PanelTitle icon={Cpu}>{t("nodeCard.specs")}</PanelTitle>
        <dl className="details-spec-list">
          {specs.map((spec) => (
            <div className="details-spec-row" key={spec.label}>
              <dt>{spec.label}</dt>
              <dd>
                {spec.value}
                {spec.note && (
                  <span className="details-spec-note">{spec.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

type DetailIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}>;

const PanelTitle = ({
  icon: Icon,
  meta,
  children,
}: {
  icon: DetailIcon;
  meta?: string;
  children: ReactNode;
}) => (
  <header className="details-panel-header">
    <h2 className="details-panel-title">
      <span className="details-panel-icon" aria-hidden="true">
        <Icon size={15} strokeWidth={2.2} />
      </span>
      {children}
    </h2>
    {meta && <span className="details-panel-meta">{meta}</span>}
  </header>
);

const meterTone = (value: number) => {
  if (value >= 80) return "critical";
  if (value >= 60) return "warning";
  return "normal";
};

const Meter = ({
  label,
  percent,
  detail,
  muted = false,
}: {
  label: string;
  percent: number;
  detail: string;
  muted?: boolean;
}) => {
  const value = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className={`details-meter details-meter--${muted ? "muted" : meterTone(value)}`}
    >
      <div className="details-meter-head">
        <span className="details-meter-label">{label}</span>
        <span className="details-meter-value">
          {muted ? "-" : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div
        className="details-meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span
          className="details-meter-fill"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="details-meter-detail">{detail}</span>
    </div>
  );
};

const LiveStat = ({
  icon: Icon,
  tone,
  label,
  value,
  note,
  title,
}: {
  icon: DetailIcon;
  tone: "up" | "down" | "load" | "uptime";
  label: string;
  value: string;
  note?: string;
  title?: string;
}) => (
  <div className={`details-stat details-stat--${tone}`} title={title}>
    <span className="details-stat-icon" aria-hidden="true">
      <Icon size={15} strokeWidth={2.2} />
    </span>
    <span className="details-stat-copy">
      <span className="details-stat-label">{label}</span>
      <strong className="details-stat-value">{value}</strong>
      {note && <span className="details-stat-note">{note}</span>}
    </span>
  </div>
);
