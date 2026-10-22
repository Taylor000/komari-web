import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import type { Record } from "../../types/LiveData";
import Flag from "../../components/Flag";
import { Card, Flex, SegmentedControl, Text } from "@radix-ui/themes";
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

    [...nodeList].sort(compareNodesByAdminOrder).forEach((node) => {
      const groupKey = node.group && node.group.trim() ? node.group : null;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(node);
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

  return (
    <div
      className={`instance-page${showServerSidebar ? " instance-page--with-sidebar" : ""}`}
    >
      {showServerSidebar && (
        <aside className="instance-sidebar">
          <Card
            className="instance-sidebar-card"
            style={{ height: "calc(100vh - 2rem)" }}
          >
            <Flex direction="column" gap="0" className="h-full min-h-0">
              <div className="p-3 border-b border-accent-3">
                <Text size="2" weight="bold">
                  {t("common.serverList", { defaultValue: "服务器列表" })}
                </Text>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {groupedNodes.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {group.group && (
                      <div className="px-3 py-1 text-xs font-semibold text-accent-8 bg-accent-2 sticky top-0">
                        {group.group}
                      </div>
                    )}
                    {group.group === null && (
                      <div className="px-3 py-1 text-xs font-semibold text-accent-8 bg-accent-2 sticky top-0">
                        {t("common.ungrouped", { defaultValue: "未分组" })}
                      </div>
                    )}
                    <div>
                      {group.nodes.map((node) => (
                        <div
                          key={node.uuid}
                          onClick={() => navigate(`/instance/${node.uuid}`)}
                          className={`mx-1 my-0.5 px-2 py-0 cursor-pointer transition-colors text-sm rounded-md border-l-[4px] flex items-center gap-2 ${
                            node.uuid === uuid
                              ? "bg-accent-4 text-accent-10 font-bold"
                              : "hover:bg-accent-3"
                          }`}
                          style={{
                            borderLeft:
                              node.uuid === uuid
                                ? "4px solid var(--accent-8)"
                                : "4px solid transparent",
                          }}
                        >
                          <Flag flag={node.region} />
                          <span
                            className={`truncate ${
                              node.uuid === uuid ? "text-accent-10" : ""
                            }`}
                          >
                            {node.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Flex>
          </Card>
        </aside>
      )}
      <main className="instance-main">
        <section className="instance-heading-card">
          <header className="instance-heading">
            <div className="instance-identity">
              <span className="instance-flag" aria-hidden="true">
                <Flag flag={node?.region ?? ""} />
              </span>
              <div className="instance-identity-copy">
                <h1 className="instance-name">{node?.name ?? uuid}</h1>
                <span className="instance-uuid">{node?.uuid}</span>
              </div>
            </div>
            <span
              className={`instance-status instance-status--${isOnline ? "online" : "offline"}`}
            >
              <span className="instance-status-dot" aria-hidden="true" />
              {isOnline ? t("nodeCard.online") : t("nodeCard.offline")}
            </span>
          </header>
          <DetailsGrid box align="center" uuid={uuid ?? ""} />
        </section>
        <div className="instance-chart-switcher">
          <SegmentedControl.Root
            radius="full"
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
      </main>
    </div>
  );
}
