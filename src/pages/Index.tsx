import {
  Callout,
  Flex,
  Text,
} from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import React, { useEffect } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Clock3,
  MapPin,
  Server,
  type LucideIcon,
} from "lucide-react";
import NodeDisplay from "../components/NodeDisplay";
import { formatBytes, formatSpeed } from "@/utils/unitHelper";
import { useLiveData } from "../contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import Loading from "@/components/loading";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import "./Index.css";

const Index = () => {
    const [t] = useTranslation();
    const { live_data } = useLiveData();
    const [currentTime, setCurrentTime] = React.useState(
      new Date().toLocaleTimeString(),
    );
    //document.title = t("home_title");
    //#region 节点数据
    const { nodeList, isLoading, error, refresh } = useNodeList();

    // 独立的时间更新定时器
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    // Status cards visibility state
    const [statusCardsVisibility] = useLocalStorage(
      "statusCardsVisibility",
      {
        currentTime: true,
        currentOnline: true,
        regionOverview: true,
        trafficOverview: true,
        networkSpeed: true,
      },
    );

    // Status cards configuration
    const statusCards = [
      {
        key: "currentTime",
        title: t("current_time"),
        getValue: () => currentTime,
        visible: statusCardsVisibility.currentTime,
        icon: Clock3,
        tone: "time" as const,
      },
      {
        key: "currentOnline",
        title: t("current_online"),
        getValue: () =>
          `${live_data?.data?.online.length ?? 0} / ${nodeList?.length ?? 0}`,
        visible: statusCardsVisibility.currentOnline,
        icon: Server,
        tone: "online" as const,
      },
      {
        key: "regionOverview",
        title: t("region_overview"),
        getValue: () =>
          nodeList
            ? Object.entries(
                nodeList.reduce(
                  (acc, item) => {
                    if (live_data?.data.online.includes(item.uuid)) {
                      acc[item.region] = (acc[item.region] || 0) + 1;
                    }
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              ).length
            : 0,
        visible: statusCardsVisibility.regionOverview,
        icon: MapPin,
        tone: "region" as const,
      },
      {
        key: "trafficOverview",
        title: t("traffic_overview"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0B / ↓ 0B";
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.totalUp || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.totalDown || 0),
            0,
          );
          return `↑ ${formatBytes(up)} / ↓ ${formatBytes(down)}`;
        },
        visible: statusCardsVisibility.trafficOverview,
        icon: ChartNoAxesCombined,
        tone: "traffic" as const,
      },
      {
        key: "networkSpeed",
        title: t("network_speed"),
        getValue: () => {
          const data = live_data?.data?.data;
          const online = live_data?.data?.online;
          if (!data || !online) return "↑ 0 B/s / ↓ 0 B/s";
          const onlineSet = new Set(online);
          const values = Object.entries(data)
            .filter(([uuid]) => onlineSet.has(uuid))
            .map(([, node]) => node);
          const up = values.reduce(
            (acc, node) => acc + (node.network.up || 0),
            0,
          );
          const down = values.reduce(
            (acc, node) => acc + (node.network.down || 0),
            0,
          );
          return `↑ ${formatSpeed(up)} / ↓ ${formatSpeed(down)}`;
        },
        visible: statusCardsVisibility.networkSpeed,
        icon: Activity,
        tone: "speed" as const,
      },
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        refresh();
      }, 5000);
      return () => clearInterval(interval);
    }, [refresh]);

    if (isLoading) {
      return <Loading />;
    }
    if (error) {
      return <div>Error: {error}</div>;
    }

    //#endregion

    return (
      <>
        <Callouts />
        <section
          className="global-summary mx-4"
          aria-label={t("global_overview", { defaultValue: "全局概览" })}
        >
          <div className="summary-stat-grid">
            {statusCards
              .filter((card) => card.visible)
              .map((card) => (
                <TopCard
                  key={card.key}
                  cardKey={card.key}
                  title={card.title}
                  value={card.getValue()}
                  icon={card.icon}
                  tone={card.tone}
                  showOnlineIndicator={
                    card.key === "currentOnline" &&
                    (live_data?.data?.online.length ?? 0) > 0
                  }
                />
              ))}
          </div>
        </section>
        <NodeDisplay
          nodes={nodeList ?? []}
          liveData={live_data?.data ?? { online: [], data: {} }}
        />
      </>
    );
};

//#region Callouts
const Callouts = () => {
  const [t] = useTranslation();
  const { showCallout } = useLiveData();
  const ishttps = window.location.protocol === "https:";
  return (
    <Flex direction="column" gap="2" className="m-2">
      <Callout.Root m="2" hidden={ishttps} color="red">
        <Callout.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10.03 3.659c.856-1.548 3.081-1.548 3.937 0l7.746 14.001c.83 1.5-.255 3.34-1.969 3.34H4.254c-1.715 0-2.8-1.84-1.97-3.34zM12.997 17A.999.999 0 1 0 11 17a.999.999 0 0 0 1.997 0m-.259-7.853a.75.75 0 0 0-1.493.103l.004 4.501l.007.102a.75.75 0 0 0 1.493-.103l-.004-4.502z"
            />
          </svg>
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            {t("warn_https")}
          </Text>
        </Callout.Text>
      </Callout.Root>
      <Callout.Root m="2" hidden={showCallout} id="callout" color="tomato">
        <Callout.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M21.707 3.707a1 1 0 0 0-1.414-1.414L18.496 4.09a4.25 4.25 0 0 0-5.251.604l-1.068 1.069a1.75 1.75 0 0 0 0 2.474l3.585 3.586a1.75 1.75 0 0 0 2.475 0l1.068-1.068a4.25 4.25 0 0 0 .605-5.25zm-11 8a1 1 0 0 0-1.414-1.414l-1.47 1.47l-.293-.293a.75.75 0 0 0-1.06 0l-1.775 1.775a4.25 4.25 0 0 0-.605 5.25l-1.797 1.798a1 1 0 1 0 1.414 1.414l1.798-1.797a4.25 4.25 0 0 0 5.25-.605l1.775-1.775a.75.75 0 0 0 0-1.06l-.293-.293l1.47-1.47a1 1 0 0 0-1.414-1.414l-1.47 1.47l-1.586-1.586z"
            />
          </svg>
        </Callout.Icon>
        <Callout.Text>
          <Text size="2" weight="medium">
            {t("warn_websocket")}
          </Text>
        </Callout.Text>
      </Callout.Root>
    </Flex>
  );
};
// #endregion Callouts
export default Index;

type TopCardProps = {
  cardKey: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  tone: "time" | "online" | "region" | "traffic" | "speed";
  showOnlineIndicator?: boolean;
};

const TopCard: React.FC<TopCardProps> = React.memo(
  ({ cardKey, title, value, icon: Icon, tone, showOnlineIndicator }) => {
    return (
      <div
        className={`summary-stat summary-stat--${tone} summary-stat--${cardKey}`}
      >
        <div className="summary-stat-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
          {showOnlineIndicator && <span className="summary-online-dot" />}
        </div>
        <div className="summary-stat-content">
          <span className="summary-stat-label">{title}</span>
          <span className="summary-stat-value">{value}</span>
        </div>
      </div>
    );
  },
);
