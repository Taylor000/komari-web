import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "../../types/LiveData";
import Flag from "../../components/Flag";
import { SegmentedControl } from "@radix-ui/themes";
import { ArrowLeft, Layers3 } from "lucide-react";
import { getOSImage, getOSName } from "@/utils/osImageHelper";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import LoadChart from "./LoadChart";
import PingChart from "./PingChart";
import { DetailsGrid } from "@/components/DetailsGrid";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { compareNodesByAdminOrder } from "@/utils/nodeOrder";
import Loading from "@/components/loading";

export default function InstancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onRefresh, live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const [recent, setRecent] = useState<Record[]>([]);
  const { nodeList } = useNodeList();
  const length = 30 * 5;
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  // #region 初始数据加载
  const node = nodeList?.find((n) => n.uuid === uuid);
  const isOnline = Boolean(uuid && live_data?.data.online.includes(uuid));
  const { publicInfo, error: publicInfoError } = usePublicInfo();
  const isMobile = useIsMobile();
  const showServerListInDetails =
    publicInfo?.theme_settings?.showServerListInDetails === true;
  const showServerSidebar = showServerListInDetails && !isMobile;

  // 详情页列表与后台分组、服务器自定义顺序保持一致。
  const groupedNodes = useMemo(() => {
    if (!nodeList) return [];

    const groups = new Map<string | null, typeof nodeList>();

    [...nodeList].sort(compareNodesByAdminOrder).forEach((item) => {
      const groupKey = item.group && item.group.trim() ? item.group : null;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(item);
    });

    return Array.from(groups.entries()).map(([group, nodes]) => ({
      group,
      nodes,
    }));
  }, [nodeList]);

  useEffect(() => {
    if (!uuid) {
      setRecent([]);
      return;
    }

    const controller = new AbortController();
    setRecent([]);

    fetch(`/api/recent/${uuid}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecent((data?.data ?? []).slice(-length));
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch recent data:", err);
        }
      });

    return () => controller.abort();
  }, [uuid, length]);
  // 动态追加数据
  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        // 追加新数据，限制总长度为length（FIFO）
        // 检查是否已存在相同时间戳的记录
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at,
        );
        if (exists) {
          return prev; // 如果已存在，不添加新记录
        }

        // 否则，追加新记录
        const updated = [...prev, newRecord].slice(-length);
        return updated;
      });
    });

    // 清理订阅
    return unsubscribe;
  }, [length, onRefresh, uuid]);
  // #region 布局
  // The sidebar setting comes from /api/public. Do not render the detail grid
  // into an unknown column while that layout preference is still loading.
  if (!publicInfo && !publicInfoError) {
    return (
      <div className="instance-page-loading" aria-busy="true">
        <Loading />
      </div>
    );
  }

  const onlineSet = new Set(live_data?.data.online ?? []);
  const osLabel = node?.os ? `${getOSName(node.os)} / ${node.arch}` : null;

  return (
    <div
      className={`instance-page${showServerSidebar ? " instance-page--with-sidebar" : ""}`}
    >
      {showServerSidebar && (
        <aside className="instance-sidebar">
          <nav
            className="instance-sidebar-card"
            aria-label={t("common.serverList", { defaultValue: "服务器列表" })}
          >
            <div className="instance-sidebar-header">
              {t("common.serverList", { defaultValue: "服务器列表" })}
              <span className="instance-sidebar-count">
                {onlineSet.size} / {nodeList?.length ?? 0}
              </span>
            </div>
            <div className="instance-sidebar-scroll">
              {groupedNodes.map((group, groupIndex) => (
                <div key={groupIndex} className="instance-sidebar-group">
                  <div className="instance-sidebar-group-title">
                    {group.group ??
                      t("common.ungrouped", { defaultValue: "未分组" })}
                  </div>
                  {group.nodes.map((item) => (
                    <button
                      type="button"
                      key={item.uuid}
                      onClick={() => navigate(`/instance/${item.uuid}`)}
                      className={`instance-sidebar-item${
                        item.uuid === uuid ? " is-active" : ""
                      }`}
                      aria-current={item.uuid === uuid ? "page" : undefined}
                    >
                      <Flag flag={item.region} />
                      <span className="instance-sidebar-name">{item.name}</span>
                      <span
                        className={`instance-sidebar-dot${
                          onlineSet.has(item.uuid) ? " is-online" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        </aside>
      )}
      <main className="instance-main">
        <Link to="/" className="instance-back">
          <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" />
          {t("nodeCard.backToList")}
        </Link>
        <section className="instance-hero">
          <span className="instance-flag" aria-hidden="true">
            <Flag flag={node?.region ?? ""} />
          </span>
          <div className="instance-identity">
            <div className="instance-title-row">
              <h1 className="instance-name">{node?.name ?? uuid}</h1>
              <span
                className={`instance-status instance-status--${isOnline ? "online" : "offline"}`}
              >
                <span className="instance-status-dot" aria-hidden="true" />
                {isOnline ? t("nodeCard.online") : t("nodeCard.offline")}
              </span>
            </div>
            <div className="instance-chips">
              {node?.group && (
                <span className="instance-chip instance-chip--accent">
                  <Layers3 size={12} aria-hidden="true" />
                  {node.group}
                </span>
              )}
              {osLabel && node && (
                <span className="instance-chip">
                  <img src={getOSImage(node.os)} alt="" aria-hidden="true" />
                  {osLabel}
                </span>
              )}
              {node?.virtualization && (
                <span className="instance-chip">{node.virtualization}</span>
              )}
              {node?.uuid && (
                <span className="instance-chip instance-chip--mono">
                  {node.uuid}
                </span>
              )}
            </div>
          </div>
        </section>
        <DetailsGrid box align="center" uuid={uuid ?? ""} />
        <section className="instance-charts">
          <div className="instance-charts-header">
            <h2 className="instance-charts-title">
              {t("nodeCard.chartsTitle")}
            </h2>
            <SegmentedControl.Root
              radius="full"
              size="1"
              value={chartView}
              onValueChange={(value) => setChartView(value as "load" | "ping")}
            >
              <SegmentedControl.Item value="load">
                {t("nodeCard.load")}
              </SegmentedControl.Item>
              <SegmentedControl.Item value="ping">
                {t("nodeCard.ping")}
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
          {/* Recharts */}
          {chartView === "load" ? (
            <LoadChart data={liveDataToRecords(uuid ?? "", recent)} />
          ) : (
            <PingChart uuid={uuid ?? ""} />
          )}
        </section>
      </main>
    </div>
  );
}
