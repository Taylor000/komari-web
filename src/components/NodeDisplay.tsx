import React, { useState, useMemo, useRef, useEffect, Suspense } from "react";
import {
  Flex,
  Text,
  IconButton,
  TextField,
} from "@radix-ui/themes";
import {
  CalendarClock,
  Search,
  Grid3X3,
  Layers3,
  ReceiptText,
  Table2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "../types/LiveData";
import { NodeGrid } from "./Node";
const NodeTable = React.lazy(() => import("./NodeTable"));
import { isRegionMatch } from "@/utils/regionHelper";
import { formatBytes, formatSpeed } from "@/utils/unitHelper";
import Loading from "./loading";
import { compareNodesByAdminOrder } from "@/utils/nodeOrder";
import SubscriptionDisplay, { getRemainingDays } from "./SubscriptionDisplay";
import { fetchPublicSubscriptions } from "@/lib/subscriptions";
import type { Subscription } from "@/types/Subscription";
import "./NodeDisplay.css";

export type ViewMode = "grid" | "table";
type HomeContent = "servers" | "subscriptions" | "expiring";

const EXPIRING_WINDOW_DAYS = 7;
const EXPIRING_REFRESH_INTERVAL_MS = 60 * 1000;

function isNodeExpiringWithinSevenDays(expiresAt: string) {
  const remainingDays = getRemainingDays(expiresAt);
  return (
    Number.isFinite(remainingDays) &&
    remainingDays >= 0 &&
    remainingDays <= EXPIRING_WINDOW_DAYS
  );
}

function isSubscriptionExpiringWithinSevenDays(expiresAt: string) {
  const remainingDays = getRemainingDays(expiresAt);
  return (
    Number.isFinite(remainingDays) &&
    remainingDays >= 0 &&
    remainingDays <= EXPIRING_WINDOW_DAYS
  );
}

interface NodeDisplayProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

const NodeDisplay: React.FC<NodeDisplayProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    "nodeViewMode",
    "grid",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>(
    "nodeSelectedGroup",
    "all",
  );
  const [activeContent, setActiveContent] = useLocalStorage<HomeContent>(
    "homeContentView",
    "servers",
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoaded, setSubscriptionsLoaded] = useState(false);
  const [, setExpirationDateKey] = useState(() =>
    new Date().toDateString(),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetchPublicSubscriptions()
      .then((items) => {
        if (active) setSubscriptions(items);
      })
      .catch((error) => console.warn("Failed to load subscriptions:", error))
      .finally(() => {
        if (active) setSubscriptionsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Keep date-based filters correct when the dashboard stays open overnight.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setExpirationDateKey(new Date().toDateString());
    }, EXPIRING_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const orderedNodes = useMemo(
    () => [...nodes].sort(compareNodesByAdminOrder),
    [nodes],
  );

  // 分组顺序继承后台“服务器分组”页面保存的顺序。
  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    orderedNodes.forEach((node) => {
      if (node.group && node.group.trim()) {
        groupSet.add(node.group);
      }
    });
    return Array.from(groupSet);
  }, [orderedNodes]);

  const groupNodeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((node) => {
      if (!node.group?.trim()) return;
      counts.set(node.group, (counts.get(node.group) ?? 0) + 1);
    });
    return counts;
  }, [nodes]);

  const expiringNodes = orderedNodes.filter((node) =>
    isNodeExpiringWithinSevenDays(node.expired_at),
  );

  const expiringSubscriptions = subscriptions.filter((item) =>
    isSubscriptionExpiringWithinSevenDays(item.expires_at),
  );

  const expiringServiceCount =
    expiringNodes.length + expiringSubscriptions.length;

  // A stored group may disappear after the node list changes.
  useEffect(() => {
    if (selectedGroup !== "all" && !groups.includes(selectedGroup)) {
      setSelectedGroup("all");
    }
  }, [groups, selectedGroup, setSelectedGroup]);

  useEffect(() => {
    if (
      subscriptionsLoaded &&
      activeContent === "subscriptions" &&
      subscriptions.length === 0
    ) {
      setActiveContent("servers");
    }
  }, [activeContent, setActiveContent, subscriptions, subscriptionsLoaded]);

  // Group statistics intentionally ignore the search term. They describe the
  // selected group as a whole and use online nodes, matching the top overview.
  const selectedGroupNodes = useMemo(
    () =>
      activeContent === "expiring"
        ? expiringNodes
        : selectedGroup === "all"
          ? orderedNodes
          : orderedNodes.filter((node) => node.group === selectedGroup),
    [activeContent, expiringNodes, orderedNodes, selectedGroup],
  );

  const selectedGroupStats = useMemo(() => {
    const onlineSet = new Set(liveData?.online ?? []);

    return selectedGroupNodes.reduce(
      (stats, node) => {
        if (!onlineSet.has(node.uuid)) return stats;

        stats.online += 1;
        const network = liveData?.data?.[node.uuid]?.network;
        if (!network) return stats;

        stats.totalUp += network.totalUp || 0;
        stats.totalDown += network.totalDown || 0;
        stats.up += network.up || 0;
        stats.down += network.down || 0;
        return stats;
      },
      { online: 0, totalUp: 0, totalDown: 0, up: 0, down: 0 },
    );
  }, [liveData, selectedGroupNodes]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 按 "/" 键聚焦搜索框
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // 按 Escape 键清空搜索
      if (e.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  // 过滤节点
  const filteredNodes = useMemo(() => {
    let result = activeContent === "expiring" ? expiringNodes : orderedNodes;

    // 先按分组过滤
    if (activeContent === "servers" && selectedGroup !== "all") {
      result = result.filter((node) => node.group === selectedGroup);
    }

    // 到期筛选是跨类型固定视图，不受服务器搜索框的残留值影响。
    if (activeContent === "expiring" || !searchTerm.trim()) return result;

    const term = searchTerm.toLowerCase().trim();
    return result.filter((node) => {
      // 基本信息搜索
      const basicMatch =
        node.name.toLowerCase().includes(term) ||
        node.os.toLowerCase().includes(term) ||
        node.arch.toLowerCase().includes(term);

      // 地区搜索（支持emoji和地区名称）
      const regionMatch = isRegionMatch(node.region, term);

      // 价格搜索（如果输入数字）
      const priceMatch =
        !isNaN(Number(term)) && node.price.toString().includes(term);

      // 状态搜索
      const isOnline = liveData?.online?.includes(node.uuid) || false;
      const statusMatch =
        ((term === "online" || term === "在线") && isOnline) ||
        ((term === "offline" || term === "离线") && !isOnline);

      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [
    activeContent,
    expiringNodes,
    orderedNodes,
    searchTerm,
    liveData,
    selectedGroup,
  ]);

  return (
    <div className="w-full">
      {/* 服务器分组与会员订阅共用同一级内容入口。 */}
      <section
        className="group-panel mx-4 mb-3"
        aria-labelledby="home-content-title"
      >
        <div className="group-panel-header">
          <div className="group-panel-heading">
            <span className="group-panel-icon" aria-hidden="true">
              <Layers3 size={17} strokeWidth={2} />
            </span>
            <div className="group-panel-heading-copy">
              <Text id="home-content-title" size="2" weight="bold">
                {t("nodeCard.contentPanelTitle")}
              </Text>
            </div>
          </div>
        </div>

        <div className="group-options-scroll">
          <div
            className="group-options"
            role="group"
            aria-label={t("nodeCard.contentPanelTitle")}
          >
            <button
              type="button"
              className={`group-option ${activeContent === "servers" && selectedGroup === "all" ? "is-active" : ""}`}
              aria-pressed={activeContent === "servers" && selectedGroup === "all"}
              aria-label={t("nodeCard.groupOptionLabel", {
                group: t("common.all"),
                count: nodes.length,
              })}
              onClick={() => {
                setActiveContent("servers");
                setSelectedGroup("all");
              }}
            >
              <span className="group-option-label">{t("common.all")}</span>
              <span className="group-option-count" aria-hidden="true">
                {nodes.length}
              </span>
            </button>
            <button
              type="button"
              className={`group-option group-option--fixed ${activeContent === "expiring" ? "is-active" : ""}`}
              aria-pressed={activeContent === "expiring"}
              aria-label={t("nodeCard.expiringOptionLabel", {
                count: expiringServiceCount,
              })}
              onClick={() => {
                setActiveContent("expiring");
                setSelectedGroup("all");
              }}
            >
              <CalendarClock size={14} aria-hidden="true" />
              <span className="group-option-label">
                {t("nodeCard.expiringSoon")}
              </span>
              <span className="group-option-count" aria-hidden="true">
                {expiringServiceCount}
              </span>
            </button>
            {subscriptions.length > 0 && (
              <button
                type="button"
                className={`group-option group-option--fixed ${activeContent === "subscriptions" ? "is-active" : ""}`}
                aria-pressed={activeContent === "subscriptions"}
                aria-label={t("subscriptions.groupOptionLabel", {
                  count: subscriptions.length,
                })}
                onClick={() => setActiveContent("subscriptions")}
              >
                <ReceiptText size={14} aria-hidden="true" />
                <span className="group-option-label">
                  {t("subscriptions.title")}
                </span>
                <span className="group-option-count" aria-hidden="true">
                  {subscriptions.length}
                </span>
              </button>
            )}
            {groups.map((group) => (
              <button
                type="button"
                key={group}
                className={`group-option ${activeContent === "servers" && selectedGroup === group ? "is-active" : ""}`}
                aria-pressed={activeContent === "servers" && selectedGroup === group}
                aria-label={t("nodeCard.groupOptionLabel", {
                  group,
                  count: groupNodeCounts.get(group) ?? 0,
                })}
                onClick={() => {
                  setActiveContent("servers");
                  setSelectedGroup(group);
                }}
              >
                <span className="group-option-label">{group}</span>
                <span className="group-option-count" aria-hidden="true">
                  {groupNodeCounts.get(group) ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeContent === "servers" && selectedGroup !== "all" && (
          <div
            className="group-summary"
            role="group"
            aria-label={t("nodeCard.groupSummary", {
              group: selectedGroup,
            })}
          >
            <div className="group-summary-identity">
              <div className="group-summary-title">
                <span className="group-summary-dot" aria-hidden="true" />
                <Text size="2" weight="medium">
                  {selectedGroup}
                </Text>
              </div>
              <Text size="1" color="gray" className="whitespace-nowrap">
                {t("nodeCard.groupAvailability", {
                  online: selectedGroupStats.online,
                  total: selectedGroupNodes.length,
                })}
              </Text>
            </div>

            <div className="group-summary-metrics">
              <div className="group-summary-metric">
                <Text size="1" color="gray">
                  {t("network_speed")}
                </Text>
                <Text size="2" weight="medium" className="whitespace-nowrap">
                  ↑ {formatSpeed(selectedGroupStats.up)} / ↓{" "}
                  {formatSpeed(selectedGroupStats.down)}
                </Text>
              </div>
              <div className="group-summary-metric">
                <Text size="1" color="gray">
                  {t("nodeCard.totalTraffic")}
                </Text>
                <Text size="2" weight="medium" className="whitespace-nowrap">
                  ↑ {formatBytes(selectedGroupStats.totalUp)} / ↓{" "}
                  {formatBytes(selectedGroupStats.totalDown)}
                </Text>
              </div>
            </div>
          </div>
        )}
      </section>

      {activeContent === "subscriptions" ? (
        <SubscriptionDisplay items={subscriptions} />
      ) : (
        <>
          {/* 服务器搜索与视图控制只在常规服务器内容中显示。 */}
          {activeContent === "servers" && (
            <Flex
              direction={{ initial: "column", sm: "row" }}
              justify="between"
              align={{ initial: "stretch", sm: "center" }}
              gap="4"
              className="control-bar mb-2 p-4 rounded-lg"
            >
              <Flex
                align="center"
                gap="2"
                className="flex-1 max-w-md relative"
                wrap="wrap"
              >
                <TextField.Root
                  ref={searchRef}
                  placeholder={t("search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-box flex-1 pr-8 min-w-32"
                >
                  <TextField.Slot>
                    <Search size={16} />
                  </TextField.Slot>
                </TextField.Root>
                {searchTerm && (
                  <IconButton
                    variant="ghost"
                    size="1"
                    className="absolute right-2 h-6 w-6 search-clear-button"
                    aria-label={t("search.clear")}
                    onClick={() => {
                      setSearchTerm("");
                      searchRef.current?.focus();
                    }}
                  >
                    <X size={12} />
                  </IconButton>
                )}
              </Flex>

              <Flex align="center" gap="2">
                <label className="whitespace-nowrap text-sm text-muted-foreground">
                  {t("view.mode")}
                </label>
                <Flex gap="1">
                  <IconButton
                    variant={viewMode === "grid" ? "solid" : "soft"}
                    onClick={() => setViewMode("grid")}
                    color="gray"
                    highContrast
                    className="transition-colors view-switch-button"
                    aria-label={t("view.grid")}
                  >
                    <Grid3X3 size={16} />
                  </IconButton>
                  <IconButton
                    variant={viewMode === "table" ? "solid" : "soft"}
                    onClick={() => setViewMode("table")}
                    color="gray"
                    highContrast
                    className="transition-colors view-switch-button"
                    aria-label={t("view.table")}
                  >
                    <Table2 size={16} />
                  </IconButton>
                </Flex>
              </Flex>
            </Flex>
          )}

          {activeContent === "expiring" && (
            <Flex
              justify="between"
              align={{ initial: "start", sm: "center" }}
              direction={{ initial: "column", sm: "row" }}
              gap="2"
              className="expiring-summary mx-4 mb-3"
            >
              <div>
                <Text as="div" size="2" weight="bold">
                  {t("nodeCard.expiringSoon")}
                </Text>
                <Text as="div" size="1" color="gray">
                  {t("nodeCard.expiringSummary", {
                    nodes: expiringNodes.length,
                    subscriptions: expiringSubscriptions.length,
                  })}
                </Text>
              </div>
              <Flex gap="1" aria-label={t("view.mode")}>
                <IconButton
                  variant={viewMode === "grid" ? "solid" : "soft"}
                  onClick={() => setViewMode("grid")}
                  color="gray"
                    highContrast
                    className="transition-colors view-switch-button"
                  aria-label={t("view.grid")}
                >
                  <Grid3X3 size={16} />
                </IconButton>
                <IconButton
                  variant={viewMode === "table" ? "solid" : "soft"}
                  onClick={() => setViewMode("table")}
                  color="gray"
                    highContrast
                    className="transition-colors view-switch-button"
                  aria-label={t("view.table")}
                >
                  <Table2 size={16} />
                </IconButton>
              </Flex>
            </Flex>
          )}

          {activeContent === "servers" &&
            (searchTerm.trim() || selectedGroup === "all") && (
              <Flex justify="between" align="center" className="mx-4 mb-2">
                <Text size="2" color="gray">
                  {searchTerm.trim()
                    ? t("search.results", {
                        count: filteredNodes.length,
                        total:
                          selectedGroup === "all"
                            ? nodes.length
                            : selectedGroupNodes.length,
                      })
                    : t("nodeCard.totalNodes", {
                        total: nodes.length,
                        online: liveData?.online?.length || 0,
                      })}
                </Text>
              </Flex>
            )}

          {activeContent === "expiring" && expiringServiceCount === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              className="py-16 mx-4"
            >
              <CalendarClock size={28} className="mb-3 text-muted-foreground" />
              <Text size="4" color="gray" className="mb-2">
                {t("nodeCard.noExpiringServices")}
              </Text>
              <Text size="2" color="gray">
                {t("nodeCard.noExpiringServicesDescription")}
              </Text>
            </Flex>
          ) : filteredNodes.length === 0 ? (
            activeContent === "servers" ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                className="py-16 mx-4"
              >
                <Text size="4" color="gray" className="mb-2">
                  {searchTerm.trim()
                    ? t("search.no_results")
                    : t("nodes.empty")}
                </Text>
                {searchTerm.trim() && (
                  <Text size="2" color="gray">
                    {t("search.try_different")}
                  </Text>
                )}
              </Flex>
            ) : null
          ) : viewMode === "grid" ? (
            <NodeGrid nodes={filteredNodes} liveData={liveData} />
          ) : (
            <Suspense fallback={<Loading text={t("nodes.loading")} />}>
              <NodeTable nodes={filteredNodes} liveData={liveData} />
            </Suspense>
          )}

          {activeContent === "expiring" && expiringSubscriptions.length > 0 && (
            <SubscriptionDisplay items={expiringSubscriptions} />
          )}
        </>
      )}
    </div>
  );
};

export default NodeDisplay;
