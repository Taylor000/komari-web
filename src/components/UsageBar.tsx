import { Box, Flex, Text } from "@radix-ui/themes";
import React from "react";

interface UsageBarProps {
  value: number; // Utilization percentage (0–100)
  label: string; // Label for the bar (e.g., "CPU", "Memory", "Disk")
  compact?: boolean; // Whether to show in compact mode (for tables)
  max?: number; // Maximum value for the bar (e.g., total RAM, total disk space)
}

const UsageBar = React.memo(
  ({ value, label, compact = false, max = 100 }: UsageBarProps) => {
    // Ensure value is between 0 and 100
    const clampedValue = Math.min(Math.max(value, 0), max);
    const ariaMax = Number.isFinite(max)
      ? max
      : Math.max(100, Math.ceil(clampedValue));

    // Determine color based on thresholds
    const getColor = (val: number) => {
      if (val >= 80) return "red";
      if (val >= 60) return "orange";
      return "green";
    };

    const barColor = getColor(clampedValue);

    if (compact) {
      return (
        <Box style={{ width: "100%" }}>
          <Box
            className="usage-bar-track usage-bar-track--compact"
            style={{
              width: "100%",
              marginBottom: "2px",
            }}
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={ariaMax}
            aria-valuenow={clampedValue}
          >
            <div
              className={`usage-bar-fill usage-bar-fill--${barColor}`}
              style={{
                width: `${clampedValue}%`,
              }}
            />
          </Box>
          <label color="gray" className="text-sm">
            {clampedValue.toFixed(1)}%
          </label>
        </Box>
      );
    }

    return (
      <Flex direction="column" gap="1" style={{ width: "100%" }}>
        <Flex justify="between" align="center">
          <Text size="2" color="gray">
            {label}
          </Text>
          <Text size="2" weight="medium">
            {clampedValue.toFixed(1)}%
          </Text>
        </Flex>
        <Box
          className="usage-bar-track"
          style={{
            width: "100%",
          }}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={ariaMax}
          aria-valuenow={clampedValue}
        >
          <div
            className={`usage-bar-fill usage-bar-fill--${barColor}`}
            style={{
              width: `${clampedValue}%`,
            }}
          />
        </Box>
      </Flex>
    );
  },
);

export default UsageBar;
