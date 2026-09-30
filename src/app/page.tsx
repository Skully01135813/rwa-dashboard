import Link from "next/link";

import {
  createPublicClient,
  http,
  type Address,
} from "viem";

import { sepolia } from "viem/chains";

import RiskHistoryChart, {
  type ChartPoint,
} from "./RiskHistoryChart";

const CONTRACT_ADDRESS =
  "0xc399129Db5BE56176cF833BBbcda9E48a2f31759" as Address;

const RPC_URL =
  "https://ethereum-sepolia-rpc.publicnode.com";

const API_BASE =
  "https://rwa-risk-api-u5im.onrender.com";

const contractAbi = [
  {
    type: "function",
    name: "portfolioValue",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "debt",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "riskThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "hasRiskAssessment",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },

  {
    type: "function",
    name: "lastRiskTriggered",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },

  {
    type: "function",
    name: "lastRiskAssessmentTimestamp",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },

] as const;

type PortfolioData = {
  portfolioValue: number;
  debt: number;
  currentLTV: number;
  riskThreshold: number;
  hasRiskAssessment: boolean;
  lastRiskTriggered: boolean;
  lastRiskAssessmentTimestamp: number;
};

type RiskHistoryItem = {
  id: number;
  portfolioId: string;
  portfolioName: string;
  valuation: number;
  debt: number;
  ltv: number;
  riskThreshold: number;
  thresholdBreach: number;
  riskLevel: string;
  riskTriggered: boolean;
  valuationConfidence: number | null;
  aiSummary: string | null;
  recommendedAction: string | null;
  requiresHumanReview: boolean;
  createdAt: string;
};

type PageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

async function getPortfolioData(): Promise<PortfolioData | null> {
  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });

    const [
      portfolioValueRaw,
      debtRaw,
      riskThresholdRaw,
      hasRiskAssessmentRaw,
      lastRiskTriggeredRaw,
      lastRiskAssessmentTimestampRaw,
    ] = await Promise.all([
      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "portfolioValue",
      }),

      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "debt",
      }),

      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "riskThreshold",
      }),

      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "hasRiskAssessment",
      }),

      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "lastRiskTriggered",
      }),

      client.readContract({
        address: CONTRACT_ADDRESS,
        abi: contractAbi,
        functionName: "lastRiskAssessmentTimestamp",
      }),
    ]);
    const portfolioValue =
      Number(portfolioValueRaw);

    const debt =
      Number(debtRaw);

    const riskThreshold =
      Number(riskThresholdRaw);

    const hasRiskAssessment =
      Boolean(hasRiskAssessmentRaw);

    const lastRiskTriggered =
      Boolean(lastRiskTriggeredRaw);

    const lastRiskAssessmentTimestamp =
      Number(lastRiskAssessmentTimestampRaw);

    const currentLTV =
      (debt / portfolioValue) * 100;

    return {
      portfolioValue,
      debt,
      currentLTV,
      riskThreshold,
      hasRiskAssessment,
      lastRiskTriggered,
      lastRiskAssessmentTimestamp,
    };

  } catch (error) {
    console.error(
      "Sepolia contract read failed:",
      error,
    );

    return null;
  }
}

async function getLatestRisk(
  portfolioId: string,
): Promise<RiskHistoryItem | null> {
  try {
    const response = await fetch(
      `${API_BASE}/latest/${portfolioId}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Latest risk API returned ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(
      "Latest risk API error:",
      error,
    );

    return null;
  }
}

async function getRiskHistory(
  portfolioId: string,
): Promise<RiskHistoryItem[]> {
  try {
    const response = await fetch(
      `${API_BASE}/history/${portfolioId}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `History API returned ${response.status}`,
      );
    }

    const data =
      (await response.json()) as RiskHistoryItem[];

    return data
      .slice()
      .reverse();
  } catch (error) {
    console.error(
      "Risk history error:",
      error,
    );

    return [];
  }
}

export default async function Home({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const demoMode =
    params.mode === "demo";

  const portfolioId =
    demoMode
      ? "ACME-DEMO-001"
      : "ACME-001";

  const [
    livePortfolio,
    risk,
    history,
  ] = await Promise.all([
    demoMode
      ? Promise.resolve(null)
      : getPortfolioData(),

    getLatestRisk(
      portfolioId,
    ),

    getRiskHistory(
      portfolioId,
    ),
  ]);

  const portfolioValue =
    demoMode
      ? risk?.valuation ?? 0
      : livePortfolio?.portfolioValue ??
      risk?.valuation ??
      0;

  const debt =
    demoMode
      ? risk?.debt ?? 0
      : livePortfolio?.debt ??
      risk?.debt ??
      0;

  const currentLTV =
    demoMode
      ? risk?.ltv ?? 0
      : livePortfolio?.currentLTV ??
      risk?.ltv ??
      0;

  const riskThreshold =
    demoMode
      ? risk?.riskThreshold ?? 0
      : livePortfolio?.riskThreshold ??
      risk?.riskThreshold ??
      0;

  const usingFallback =
    !demoMode &&
    !livePortfolio &&
    !!risk;

  const chartData: ChartPoint[] =
    history.map((item) => ({
      time: new Date(
        item.createdAt,
      ).toLocaleString(),
      ltv: item.ltv,
    }));

  const displayName =
    demoMode
      ? "Acme Property Fund - Demo"
      : "Acme Property Fund";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            RWA Risk Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            {displayName}
          </h1>

          <p className="mt-2 text-slate-400">
            Chainlink CRE powered portfolio monitoring
          </p>

          <div className="mt-6 inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <Link
              href="/?mode=live"
              className={`rounded-lg px-5 py-2 text-sm font-medium transition ${!demoMode
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              LIVE PORTFOLIO
            </Link>

            <Link
              href="/?mode=demo"
              className={`rounded-lg px-5 py-2 text-sm font-medium transition ${demoMode
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-white"
                }`}
            >
              DEMO SCENARIO
            </Link>
          </div>

          {demoMode && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Demonstration data only. This scenario is separate from the live ACME-001 portfolio and does not represent current on-chain state.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {!demoMode && (
              <span
                className={
                  usingFallback
                    ? "text-amber-300"
                    : "text-emerald-300"
                }
              >
                Portfolio Data:{" "}
                {livePortfolio
                  ? "LIVE ON-CHAIN"
                  : usingFallback
                    ? "LAST KNOWN DATA"
                    : "UNAVAILABLE"}
              </span>
            )}

            {demoMode && (
              <span className="text-amber-300">
                Portfolio Data: DEMO DATASET
              </span>
            )}

            <span className="text-emerald-300">
              Latest Risk Assessment:{" "}
              {risk
                ? "CONNECTED"
                : "UNAVAILABLE"}
            </span>

            <span className="text-emerald-300">
              Risk History:{" "}
              {history.length > 0
                ? "CONNECTED"
                : "NO DATA"}
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Portfolio Value"
            value={
              portfolioValue
                ? formatMoney(
                  portfolioValue,
                )
                : "--"
            }
          />

          <MetricCard
            label="Debt"
            value={
              debt
                ? formatMoney(debt)
                : "--"
            }
          />

          <MetricCard
            label="Current LTV"
            value={
              currentLTV
                ? `${currentLTV.toFixed(
                  2,
                )}%`
                : "--"
            }
          />

          <MetricCard
            label="Risk Threshold"
            value={
              riskThreshold
                ? `${riskThreshold.toFixed(
                  2,
                )}%`
                : "--"
            }
          />
        </section>

        <section
          className={`mt-6 rounded-2xl border p-6 ${risk?.riskLevel === "HIGH"
              ? "border-red-500/30 bg-red-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
            }`}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-300">
                Current Risk Status
              </p>

              <h2
                className={`mt-2 text-3xl font-semibold ${risk?.riskLevel === "HIGH"
                    ? "text-red-300"
                    : "text-emerald-300"
                  }`}
              >
                {risk?.riskLevel ??
                  "UNAVAILABLE"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-slate-400">
                  Threshold Breach
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {risk
                    ? `${risk.thresholdBreach.toFixed(
                      2,
                    )} pts`
                    : "--"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Human Review
                </p>

                <p className="mt-1 text-xl font-semibold text-amber-300">
                  {risk
                    ? risk.requiresHumanReview
                      ? "REQUIRED"
                      : "NOT REQUIRED"
                    : "UNKNOWN"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                LTV Risk History
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Historical loan-to-value against the configured risk threshold.
              </p>
            </div>

            <p className="text-sm text-slate-400">
              {history.length} recorded assessment
              {history.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          <div className="mt-6">
            <RiskHistoryChart
              data={chartData}
              riskThreshold={
                riskThreshold
              }
            />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              AI Risk Analysis
            </p>

            <p className="mt-4 leading-7 text-slate-200">
              {risk?.aiSummary ??
                "Risk analysis is currently unavailable."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Recommended Action
            </p>

            <p className="mt-4 leading-7 text-slate-200">
              {risk?.recommendedAction ??
                "No recommendation is currently available."}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Latest Assessment
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">
                Assessment LTV
              </p>

              <p className="mt-1 text-lg font-medium">
                {risk
                  ? `${risk.ltv.toFixed(
                    2,
                  )}%`
                  : "--"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Valuation Confidence
              </p>

              <p className="mt-1 text-lg font-medium">
                {risk?.valuationConfidence != null
                  ? `${risk.valuationConfidence.toFixed(
                    0,
                  )}%`
                  : "--"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Recorded
              </p>

              <p className="mt-1 text-lg font-medium">
                {risk
                  ? new Date(
                    risk.createdAt,
                  ).toLocaleString()
                  : "--"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Infrastructure
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <StatusItem
              label="Chainlink CRE"
              status={
                demoMode
                  ? "Demo Context"
                  : "Operational"
              }
            />

            <StatusItem
              label="Ethereum Sepolia"
              status={
                demoMode
                  ? "Not Used"
                  : livePortfolio
                    ? "Connected"
                    : "Fallback"
              }
            />

            <StatusItem
              label="Latest Assessment API"
              status={
                risk
                  ? "Online"
                  : "Unavailable"
              }
            />

            <StatusItem
              label="Supabase History"
              status={
                history.length > 0
                  ? "Connected"
                  : "No Data"
              }
            />

            <StatusItem
              label="On-Chain Risk Assessment"
              status={
                demoMode
                  ? "Not Used"
                  : !livePortfolio?.hasRiskAssessment
                    ? "Not Recorded"
                    : livePortfolio.lastRiskTriggered
                      ? "HIGH"
                      : "SAFE"
              }
            />

            <StatusItem
              label="Last On-Chain Assessment"
              status={
                demoMode
                  ? "Not Used"
                  : livePortfolio?.hasRiskAssessment &&
                    livePortfolio.lastRiskAssessmentTimestamp
                    ? new Date(
                      livePortfolio.lastRiskAssessmentTimestamp * 1000,
                    ).toLocaleString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                      timeZoneName: "short",
                    })
                    : "Not Recorded"
              }
            />

          </div>
        </section>

        {!demoMode && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              On-Chain Contract
            </p>

            <p className="mt-3 break-all font-mono text-sm text-slate-300">
              {CONTRACT_ADDRESS}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Ethereum Sepolia
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <span className="text-slate-300">
        {label}
      </span>

      <span className="text-sm font-medium text-emerald-300">
        {status}
      </span>
    </div>
  );
}

function formatMoney(
  value: number,
) {
  if (value >= 1_000_000) {
    return `$${(
      value / 1_000_000
    ).toFixed(1)}M`;
  }

  return `$${value.toLocaleString()}`;
}

