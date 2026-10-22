// 图表坐标轴的通用渲染工具。

type EdgeTickProps = {
  x?: number;
  y?: number;
  index?: number;
  visibleTicksCount?: number;
  payload?: { value: unknown };
  tickFormatter?: (value: any, index: number) => string;
};

/**
 * 首尾刻度分别左对齐/右对齐，避免时间标签被图表边缘裁切。
 */
export const EdgeTick = ({
  x = 0,
  y = 0,
  index = 0,
  visibleTicksCount = 0,
  payload,
  tickFormatter,
}: EdgeTickProps) => {
  const text = tickFormatter
    ? tickFormatter(payload?.value, index)
    : String(payload?.value ?? "");
  if (!text) return null;
  const anchor =
    index === 0 ? "start" : index === visibleTicksCount - 1 ? "end" : "middle";
  return (
    <text
      x={x}
      y={y}
      dy={12}
      textAnchor={anchor}
      className="recharts-cartesian-axis-tick-value"
      fill="currentColor"
    >
      {text}
    </text>
  );
};
