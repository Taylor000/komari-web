import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveData } from "../../contexts/LiveDataContext";
import { useTranslation } from "react-i18next";
import { Card, Flex, SegmentedControl } from "@radix-ui/themes";
import { formatBytes, noWrap } from "@/utils/unitHelper";
import { useNodeList } from "@/contexts/NodeListContext";
import fillMissingTimePoints, { type RecordFormat } from "@/utils/RecordHelper";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import Loading from "@/components/loading";
import { EdgeTick } from "./chartAxis";
// #region 图表
type LoadChartProps = {
  data: RecordFormat[];
  intervalSec?: number; // 数据间隔，单位秒
};

const LoadChart = ({ data = [] }: LoadChartProps) => {
  const { t } = useTranslation();
  const { live_data: all_live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const { nodeList } = useNodeList();
  const { publicInfo } = usePublicInfo();
  const max_record_preserve_time = publicInfo?.record_preserve_time || 0;
  // 计算可用视图
  const [hoursView, setHoursView] = useState<string>("real-time");
  const [remoteData, setRemoteData] = useState<RecordFormat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // real-time 总是可用
  // 其余根据 max_record_preserve_time (单位: 小时) 动态生成
  // 4hour, 1day(24h), 7day(168h), 30day(720h)
  // 超过最大预设则显示 "xxx hours"
  const presetViews = useMemo(
    () => [
      { label: t("chart.hours", { count: 4 }), hours: 4 },
      { label: t("chart.days", { count: 1 }), hours: 24 },
      { label: t("chart.days", { count: 7 }), hours: 168 },
      { label: t("chart.days", { count: 30 }), hours: 720 },
    ],
    [t],
  );
  const avaliableView = useMemo(() => {
    const views: { label: string; hours?: number }[] = [
      { label: t("common.real_time") },
    ];
    if (max_record_preserve_time <= 0) return views;

    for (const view of presetViews) {
      if (max_record_preserve_time >= view.hours) {
        views.push(view);
      }
    }
    const maxPreset = presetViews[presetViews.length - 1];
    if (
      max_record_preserve_time > maxPreset.hours ||
      (max_record_preserve_time > 4 &&
        !presetViews.some((view) => view.hours === max_record_preserve_time))
    ) {
      views.push({
        label:
          max_record_preserve_time % 24 === 0
            ? t("chart.days", {
                count: Math.floor(max_record_preserve_time / 24),
              })
            : t("chart.hours", { count: max_record_preserve_time }),
        hours: max_record_preserve_time,
      });
    }
    return views;
  }, [max_record_preserve_time, presetViews, t]);

  // Select the first valid view when retention or language changes.
  useEffect(() => {
    setHoursView(avaliableView[0].label);
  }, [avaliableView]);

  // 新增：根据 hoursView 拉取数据
  useEffect(() => {
    // 找到当前 hoursView 对应的 hours
    const selected = avaliableView.find((v) => v.label === hoursView);
    if (!uuid) return;
    if (!selected || !selected.hours) {
      setRemoteData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/records/load?uuid=${uuid}&hours=${selected.hours}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((resp) => {
        const records = resp.data?.records || [];
        const gpuDevices = resp.data?.gpu_devices || {};

        // 合并基础记录和GPU数据
        const mergedRecords = records.map((record: RecordFormat) => {
          const gpuDetailed = [];

          // 遍历所有GPU设备，找到对应时间的GPU数据
          for (const deviceIndex in gpuDevices) {
            const device = gpuDevices[deviceIndex];
            const gpuRecord = device.records?.find(
              (gr: any) =>
                new Date(gr.time).getTime() === new Date(record.time).getTime()
            );

            if (gpuRecord) {
              gpuDetailed.push({
                usage: gpuRecord.utilization,
                memory: (gpuRecord.mem_used / gpuRecord.mem_total) * 100,
                temperature: gpuRecord.temperature,
                device_index: gpuRecord.device_index,
                device_name: gpuRecord.device_name,
                mem_total: gpuRecord.mem_total,
                mem_used: gpuRecord.mem_used,
              });
            }
          }

          return {
            ...record,
            gpu_detailed: gpuDetailed.length > 0 ? gpuDetailed : undefined,
          };
        });

        // 按照时间升序排序
        mergedRecords.sort(
          (a: RecordFormat, b: RecordFormat) =>
            new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setRemoteData(mergedRecords);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error");
        setLoading(false);
      });
  }, [avaliableView, hoursView, uuid]);

  // colors
  const colors = [
    "var(--chart-series-1)",
    "var(--chart-series-2)",
    "var(--chart-series-3)",
    "var(--chart-series-4)",
  ];
  const primaryColor = colors[0];
  const secondaryColor = colors[1];
  const cn = "instance-load-chart-card flex flex-col w-full";
  const chartMargin = {
    top: 4,
    right: 8,
    bottom: 0,
    left: 12,
  };
  const live_data = all_live_data?.data?.data[uuid ?? ""];
  const timeFormatter = (value: any, index: number) => {
    if (index === 0 || index === chartData.length - 1) {
      if (
        presetViews[0].label === hoursView ||
        hoursView === "real-time" ||
        hoursView === t("common.real_time")
      ) {
        return new Date(value).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(value).toLocaleDateString([], {
        month: "2-digit",
        day: "2-digit",
      });
    }
    return "";
  };
  const node = nodeList?.find((n) => n.uuid === uuid);
  const lableFormatter = (value: any) => {
    const date = new Date(value);
    if (hoursView === t("common.real_time") || hoursView === "real-time") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const percentageFormatter = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  const ChartTitle = (text: string, left: React.ReactNode) => {
    return (
      <div className="chart-card-header">
        <span className="chart-card-title">{text}</span>
        <span className="chart-card-value">{left}</span>
      </div>
    );
  };
  // 双序列卡片的数值行：前面加对应曲线颜色的小圆点，便于对照
  const SeriesValue = ({
    color,
    children,
  }: {
    color: string;
    children: React.ReactNode;
  }) => (
    <span className="chart-card-series">
      <i style={{ backgroundColor: color }} />
      {children}
    </span>
  );
  const minute = 60;
  const hour = minute * 60;
  // 限制实时模式的数据点数量，避免长时间运行时数据无限增长
  const MAX_REALTIME_POINTS = 30 * 5; // 与父组件 recent.length 一致（150）
  const isRealtime =
    hoursView === t("common.real_time") || hoursView === "real-time";
  const realtimeData = Array.isArray(data)
    ? data.slice(-MAX_REALTIME_POINTS)
    : data;

  const chartData = isRealtime
    ? realtimeData
    : hoursView === presetViews[0].label
    ? fillMissingTimePoints(remoteData ?? [], minute, hour * 4, minute * 2)
    : (() => {
        const selectedHours =
          presetViews.find((v) => v.label === hoursView)?.hours ||
          avaliableView.find((v) => v.label === hoursView)?.hours ||
          24;
        const interval = selectedHours > 120 ? hour : minute * 15;
        const maxGap = interval * 2;
        return fillMissingTimePoints(
          remoteData ?? [],
          interval,
          hour * selectedHours,
          maxGap
        );
      })();

  return (
    <Flex
      direction="column"
      align="center"
      gap="2"
      className="instance-load-chart w-full max-w-screen"
    >
      <div className="instance-load-range w-full overflow-x-auto">
        <div className="w-max mx-auto">
          <SegmentedControl.Root value={hoursView} onValueChange={setHoursView}>
            {avaliableView.map((view) => (
              <SegmentedControl.Item
                key={view.label}
                value={view.label}
                className="capitalize"
              >
                {view.label === "real-time"
                  ? t("common.real_time")
                  : view.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </div>
      </div>
      {/* 新增 loading/error 提示 */}
      {loading && (
        <div style={{ textAlign: "center", width: "100%" }}>
          <Loading />
        </div>
      )}
      {error && (
        <div className="instance-chart-error">
          {error}
        </div>
      )}
      <div className="instance-load-chart-grid grid w-full mx-auto">
        {/* CPU */}
        <Card className={cn}>
          {ChartTitle(
            "CPU",
            live_data?.cpu?.usage ? `${live_data.cpu.usage.toFixed(2)}%` : "-"
          )}
          <ChartContainer
            config={{
              cpu: {
                label: "CPU",
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={percentageFormatter}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="cpu"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                fillOpacity={0.12}
                strokeWidth={1.6}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </Card>
        {/* Ram */}
        <Card className={cn}>
          {ChartTitle(
            t("nodeCard.ram"),
            <Flex gap="0" direction="column" align="end">
              <SeriesValue color={primaryColor}>
                {live_data?.ram?.used
                  ? `${formatBytes(live_data.ram.used)} / ${formatBytes(
                      node?.mem_total || 0
                    )}`
                  : "-"}
              </SeriesValue>
              <SeriesValue color={secondaryColor}>
                {live_data?.swap?.used
                  ? `${formatBytes(live_data.swap.used)} / ${formatBytes(
                      node?.swap_total || 0
                    )}`
                  : "-"}
              </SeriesValue>
            </Flex>
          )}
          <ChartContainer
            config={{
              ram: {
                label: t("nodeCard.ram"),
                color: primaryColor,
              },
              swap: {
                label: t("nodeCard.swap"),
                color: secondaryColor,
              },
            }}
          >
            <AreaChart
              data={chartData.map((item) => ({
                time: item.time,
                ram: ((item.ram ?? 0) / (node?.mem_total ?? 1)) * 100,
                ram_raw: item.ram,
                swap: ((item.swap ?? 0) / (node?.swap_total ?? 1)) * 100,
                swap_raw: item.swap,
                client: item.client,
              }))}
              accessibilityLayer
              margin={chartMargin}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}%` : ""
                }
                orientation="left"
                type="number"
                // 让Y轴显示在图表内侧
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={(value, name, props) => {
                  // value: 百分比
                  // name: ram/swap
                  // props: { payload, ... }
                  const payload = props?.payload || {};
                  let rawValue = 0;
                  if (name === "ram") {
                    rawValue = payload.ram_raw ?? 0;
                  } else if (name === "swap") {
                    rawValue = payload.swap_raw ?? 0;
                  }
                  let percent = 0;
                  if (typeof value === "number") {
                    percent = value;
                  } else if (typeof value === "string") {
                    const parsed = parseFloat(value);
                    percent = isNaN(parsed) ? 0 : parsed;
                  } else if (Array.isArray(value)) {
                    percent =
                      typeof value[0] === "number"
                        ? value[0]
                        : parseFloat(value[0] || "0");
                  }
                  return `${formatBytes(rawValue)} (${percent.toFixed(0)}%)`;
                }}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="ram"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                fillOpacity={0.12}
                strokeWidth={1.6}
                dot={false}
              />
              <Area
                dataKey="swap"
                animationDuration={0}
                stroke={secondaryColor}
                fill={secondaryColor}
                fillOpacity={0.12}
                strokeWidth={1.6}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </Card>
        {/* Disk */}
        <Card className={cn}>
          {ChartTitle(
            t("nodeCard.disk"),
            live_data?.disk?.used
              ? `${formatBytes(live_data.disk.used)} / ${formatBytes(
                  node?.disk_total || 0
                )}`
              : "-"
          )}
          <ChartContainer
            config={{
              disk: {
                label: t("nodeCard.disk"),
                color: primaryColor,
              },
            }}
          >
            <AreaChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, node?.disk_total || 100]}
                tickFormatter={(value, index) =>
                  index !== 0 ? noWrap(formatBytes(value)) : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="disk"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                fillOpacity={0.12}
                strokeWidth={1.6}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </Card>
        {/* Netwodk */}
        <Card className={cn}>
          {ChartTitle(
            t("nodeCard.networkSpeed"),
            <Flex gap="0" align="end" direction="column">
              <SeriesValue color={colors[3]}>
                ↑ {formatBytes(live_data?.network.up || 0)}/s
              </SeriesValue>
              <SeriesValue color={primaryColor}>
                ↓ {formatBytes(live_data?.network.down || 0)}/s
              </SeriesValue>
            </Flex>
          )}
          <ChartContainer
            config={{
              net_in: {
                label: t("chart.network_down"),
                color: primaryColor,
              },
              net_out: {
                label: t("chart.network_up"),
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? noWrap(formatBytes(value)) : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                formatter={formatBytes}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="net_in"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                strokeWidth={1.6}
                dot={false}
              />
              <Line
                dataKey="net_out"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                strokeWidth={1.6}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </Card>
        {/* Connections */}
        <Card className={cn}>
          {ChartTitle(
            t("chart.connections"),
            <Flex gap="0" align="end" direction="column">
              <SeriesValue color={primaryColor}>
                TCP {live_data?.connections?.tcp ?? "-"}
              </SeriesValue>
              <SeriesValue color={colors[3]}>
                UDP {live_data?.connections?.udp ?? "-"}
              </SeriesValue>
            </Flex>
          )}
          <ChartContainer
            config={{
              connections: {
                label: "TCP",
                color: primaryColor,
              },
              connections_udp: {
                label: "UDP",
                color: colors[3],
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="connections"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                strokeWidth={1.6}
                dot={false}
              />
              <Line
                dataKey="connections_udp"
                animationDuration={0}
                stroke={colors[3]}
                fill={colors[3]}
                strokeWidth={1.6}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </Card>
        {/* Process */}
        <Card className={cn}>
          {ChartTitle(t("chart.process"), live_data?.process ?? "-")}
          <ChartContainer
            config={{
              process: {
                label: t("chart.process"),
                color: primaryColor,
              },
            }}
          >
            <LineChart data={chartData} accessibilityLayer margin={chartMargin}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                tickFormatter={timeFormatter}
                interval={0}
                tick={<EdgeTick />}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, "auto"]}
                tickFormatter={(value, index) =>
                  index !== 0 ? `${value}` : ""
                }
                orientation="left"
                type="number"
                tick={{ dx: -10 }}
                mirror={true}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={lableFormatter}
                    indicator="dot"
                  />
                }
              />
              <Line
                dataKey="process"
                animationDuration={0}
                stroke={primaryColor}
                fill={primaryColor}
                strokeWidth={1.6}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </Card>
        {/* GPU Charts - Each GPU gets its own chart */}
        {live_data?.gpu &&
          live_data.gpu.count > 0 &&
          live_data.gpu.detailed_info?.map((gpu, index) => (
            <Card key={`gpu-${index}`} className={cn}>
              <Flex direction="column" gap="2">
                {ChartTitle(
                  `GPU ${index + 1}: ${gpu.name}`,
                  formatBytes(gpu.memory_total),
                )}
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="text-center">
                    <div className="font-medium">{t("chart.usage")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.utilization}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{t("chart.gpu_memory")}</div>
                    <div className="text-lg font-bold text-foreground">
                      {((gpu.memory_used / gpu.memory_total) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">
                      {t("nodeCard.temperature")}
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {gpu.temperature}°C
                    </div>
                  </div>
                </div>
              </Flex>
              <ChartContainer
                config={{
                  gpu_usage: {
                    label: "GPU",
                    color: primaryColor,
                  },
                  gpu_memory: {
                    label: t("chart.gpu_memory"),
                    color: secondaryColor,
                  },
                  gpu_temp: {
                    label: t("nodeCard.temperature"),
                    color: colors[2],
                  },
                }}
              >
                <AreaChart
                  data={chartData.map((item) => ({
                    time: item.time,
                    gpu_usage:
                      item.gpu_detailed?.[index]?.usage ?? item.gpu_usage ?? 0,
                    gpu_memory:
                      item.gpu_detailed?.[index]?.memory ??
                      item.gpu_memory ??
                      0,
                    gpu_memory_raw:
                      item.gpu_detailed?.[index]?.mem_used ??
                      (gpu.memory_total *
                        (item.gpu_detailed?.[index]?.memory || 0)) /
                        100,
                    gpu_temp: item.gpu_detailed?.[index]?.temperature ?? 0,
                    client: item.client,
                  }))}
                  accessibilityLayer
                  margin={chartMargin}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    tickFormatter={timeFormatter}
                    interval={0}
                    tick={<EdgeTick />}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value, index) =>
                      index !== 0 ? `${value}%` : ""
                    }
                    orientation="left"
                    type="number"
                    tick={{ dx: -10 }}
                    mirror={true}
                  />
                  <ChartTooltip
                    cursor={false}
                    formatter={(value, name, props) => {
                      if (name === "gpu_temp") {
                        return `${value}°C`;
                      }
                      if (name === "gpu_usage") {
                        return `${Number(value).toFixed(1)}%`;
                      }
                      if (name === "gpu_memory") {
                        const percentage = Number(value).toFixed(1);
                        const rawValue = props.payload?.gpu_memory_raw || 0;
                        return `${formatBytes(rawValue)}(${percentage}%)`;
                      }
                      return `${Number(value).toFixed(1)}`;
                    }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={lableFormatter}
                        indicator="dot"
                      />
                    }
                  />
                  <Area
                    dataKey="gpu_usage"
                    animationDuration={0}
                    stroke={primaryColor}
                    fill={primaryColor}
                    fillOpacity={0.12}
                    strokeWidth={1.6}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_memory"
                    animationDuration={0}
                    stroke={secondaryColor}
                    fill={secondaryColor}
                    fillOpacity={0.12}
                    strokeWidth={1.6}
                    dot={false}
                  />
                  <Area
                    dataKey="gpu_temp"
                    animationDuration={0}
                    stroke={colors[2]}
                    fill={colors[2]}
                    fillOpacity={0.12}
                    strokeWidth={1.6}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </Card>
          ))}
      </div>
    </Flex>
  );
};

export default LoadChart;
