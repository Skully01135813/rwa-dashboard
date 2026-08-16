"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = {
  time: string;
  ltv: number;
};

type RiskHistoryChartProps = {
  data: ChartPoint[];
  riskThreshold: number;
};

export default function RiskHistoryChart({
  data,
  riskThreshold,
}: RiskHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
        <p className="text-slate-500">
          No historical risk records yet.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 10,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#334155"
          />

          <XAxis
            dataKey="time"
            tick={{
              fill: "#94a3b8",
              fontSize: 12,
            }}
            minTickGap={40}
          />

          <YAxis
            domain={["auto", "auto"]}
            tick={{
              fill: "#94a3b8",
              fontSize: 12,
            }}
            tickFormatter={(value) =>
              `${value}%`
            }
          />

          <Tooltip
            formatter={(value) => [
              `${Number(value).toFixed(2)}%`,
              "LTV",
            ]}
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
            labelStyle={{
              color: "#cbd5e1",
            }}
          />

          <ReferenceLine
            y={riskThreshold}
            stroke="#f59e0b"
            strokeDasharray="6 6"
            label={{
              value: `Threshold ${riskThreshold.toFixed(
                2,
              )}%`,
              fill: "#fbbf24",
              position: "insideTopRight",
            }}
          />

          <Line
            type="monotone"
            dataKey="ltv"
            stroke="#f87171"
            strokeWidth={3}
            dot={{
              r: 4,
            }}
            activeDot={{
              r: 6,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}