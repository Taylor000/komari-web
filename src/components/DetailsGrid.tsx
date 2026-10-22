import { useTranslation } from "react-i18next";
import type { ComponentType, ReactNode } from "react";
import { UpDownStack } from "./UpDownStack";
import { useNodeList } from "@/contexts/NodeListContext";
import { useLiveData } from "@/contexts/LiveDataContext";
import { formatUptime } from "@/utils/unitHelper";
import { formatBytes } from "@/utils/unitHelper";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Cpu,
  HardDrive,
  MonitorCog,
} from "lucide-react";

type DetailsGridProps = {
  uuid: string;
  gap?: string;
  box?: boolean;
  align?: "start" | "center" | "end";
};

export const DetailsGrid = ({ uuid, box }: DetailsGridProps) => {
  const { t } = useTranslation();

  const { nodeList } = useNodeList();
  const { live_data } = useLiveData();
  const node = nodeList?.find((n) => n.uuid === uuid);
  const liveRecord = live_data?.data.data[uuid];

  return (
    <div
      className={`DetailsGrid instance-details-card${box ? " instance-details-card--boxed" : ""}`}
    >
      <div className="details-static-grid">
        <section className="details-cluster details-cluster--hardware">
          <DetailSectionTitle icon={Cpu}>硬件配置</DetailSectionTitle>
          <div className="details-metric-grid details-metric-grid--hardware">
            <UpDownStack
              className="details-metric details-metric--wide"
              up="CPU"
              down={`${node?.cpu_name || "Unknown"} (x${node?.cpu_cores || 0})`}
            />
            <UpDownStack
              className="details-metric details-metric--wide"
              up="GPU"
              down={node?.gpu_name || "Unknown"}
            />
            <UpDownStack
              className="details-metric"
              up={t("nodeCard.ram")}
              down={formatBytes(node?.mem_total || 0)}
            />
            <UpDownStack
              className="details-metric"
              up={t("nodeCard.swap")}
              down={formatBytes(node?.swap_total || 0)}
            />
            <UpDownStack
              className="details-metric"
              up={t("nodeCard.disk")}
              down={formatBytes(node?.disk_total || 0)}
            />
          </div>
        </section>

        <section className="details-cluster details-cluster--system">
          <DetailSectionTitle icon={MonitorCog}>系统环境</DetailSectionTitle>
          <div className="details-metric-grid details-metric-grid--system">
            <div className="details-metric details-metric--wide details-os-metric">
              <span className="details-metric-label">{t("nodeCard.os")}</span>
              <strong className="details-metric-value">
                {node?.os || "Unknown"}
              </strong>
              <span className="details-metric-note">
                {t("nodeCard.kernelVersion")}: {node?.kernel_version || "Unknown"}
              </span>
            </div>
            <UpDownStack
              className="details-metric"
              up={t("nodeCard.arch")}
              down={node?.arch || "Unknown"}
            />
            <UpDownStack
              className="details-metric"
              up={t("nodeCard.virtualization")}
              down={node?.virtualization || "Unknown"}
            />
          </div>
        </section>
      </div>

      <section
        className="details-live-strip"
        aria-label={t("nodeCard.monitoring")}
      >
        <LiveMetric
          icon={ArrowUp}
          label={t("nodeCard.networkUploadSpeed")}
          value={`${formatBytes(liveRecord?.network.up || 0)}/s`}
          note={`${t("nodeCard.totalUpload")} ${formatBytes(liveRecord?.network.totalUp || 0)}`}
        />
        <LiveMetric
          icon={ArrowDown}
          label={t("nodeCard.networkDownloadSpeed")}
          value={`${formatBytes(liveRecord?.network.down || 0)}/s`}
          note={`${t("nodeCard.totalDownload")} ${formatBytes(liveRecord?.network.totalDown || 0)}`}
        />
        <LiveMetric
          icon={Clock3}
          label={t("nodeCard.uptime")}
          value={liveRecord?.uptime ? formatUptime(liveRecord.uptime, t) : "-"}
        />
        <LiveMetric
          className="details-live-metric--updated"
          icon={HardDrive}
          label={t("nodeCard.last_updated")}
          value={
            node?.updated_at
              ? new Date(
                  liveRecord?.updated_at || node.updated_at,
                ).toLocaleString()
              : "-"
          }
        />
      </section>
    </div>
  );
};

type DetailIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}>;

const DetailSectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: DetailIcon;
  children: ReactNode;
}) => (
  <h2 className="details-cluster-title">
    <span className="details-cluster-icon" aria-hidden="true">
      <Icon size={15} strokeWidth={2} />
    </span>
    {children}
  </h2>
);

const LiveMetric = ({
  icon: Icon,
  label,
  value,
  note,
  className = "",
}: {
  icon: DetailIcon;
  label: string;
  value: string;
  note?: string;
  className?: string;
}) => (
  <div className={`details-live-metric ${className}`}>
    <span className="details-live-icon" aria-hidden="true">
      <Icon size={15} strokeWidth={2} />
    </span>
    <span className="details-live-copy">
      <span className="details-metric-label">{label}</span>
      <strong className="details-live-value">{value}</strong>
      {note && <span className="details-metric-note">{note}</span>}
    </span>
  </div>
);
