import {
  createPublicClient,
  http,
  type Address,
} from "viem";

import { sepolia } from "viem/chains";

const CONTRACT_ADDRESS =
  "0x2De6A72d27532d1DCe42a28547c7BD271c6A60A0" as Address;

const RPC_URL =
  "https://ethereum-sepolia-rpc.publicnode.com";

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
] as const;

type RiskAnalysis = {
  riskLevel: string;
  summary: string;
  thresholdBreach: number;
  recommendedAction: string;
  requiresHumanReview: boolean;
};

type PortfolioData = {
  portfolioValue: number;
  debt: number;
  currentLTV: number;
  riskThreshold: number;
};

async function getPortfolioData(): Promise<PortfolioData | null> {
  try {
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    });

    const [portfolioValueRaw, debtRaw, riskThresholdRaw] =
      await Promise.all([
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
      ]);

    const portfolioValue =
      Number(portfolioValueRaw);

    const debt =
      Number(debtRaw);

    const riskThreshold =
      Number(riskThresholdRaw);

    const currentLTV =
      (debt / portfolioValue) * 100;

    return {
      portfolioValue,
      debt,
      currentLTV,
      riskThreshold,
    };
  } catch (error) {
    console.error(
      "Sepolia contract read failed:",
      error,
    );

    return null;
  }
}

async function getRiskAnalysis(
  portfolio: PortfolioData,
): Promise<RiskAnalysis | null> {
  try {
    const riskTriggered =
      portfolio.currentLTV >
      portfolio.riskThreshold;

    const response = await fetch(
      "https://rwa-risk-api-u5im.onrender.com/analyze",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          portfolioId: "ACME-001",
          portfolioName:
            "Acme Property Fund",

          previousValuation:
            portfolio.portfolioValue,

          currentValuation:
            portfolio.portfolioValue,

          debt:
            portfolio.debt,

          previousLTV:
            portfolio.currentLTV,

          currentLTV:
            portfolio.currentLTV,

          riskThreshold:
            portfolio.riskThreshold,

          valuationConfidence: 95,

          riskTriggered,
        }),

        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Risk API returned ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error(
      "Risk Analyst API error:",
      error,
    );

    return null;
  }
}

export default async function Home() {
  const portfolio =
    await getPortfolioData();

  const risk =
    portfolio
      ? await getRiskAnalysis(portfolio)
      : null;

  const portfolioValue =
    portfolio?.portfolioValue ?? 0;

  const debt =
    portfolio?.debt ?? 0;

  const currentLTV =
    portfolio?.currentLTV ?? 0;

  const riskThreshold =
    portfolio?.riskThreshold ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            RWA Risk Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-semibold">
            Acme Property Fund
          </h1>

          <p className="mt-2 text-slate-400">
            Chainlink CRE powered portfolio monitoring
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className="text-emerald-300">
              Sepolia Contract:{" "}
              {portfolio
                ? "CONNECTED"
                : "UNAVAILABLE"}
            </span>

            <span className="text-emerald-300">
              AI Risk Analyst:{" "}
              {risk
                ? "CONNECTED"
                : "UNAVAILABLE"}
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Portfolio Value"
            value={
              portfolio
                ? formatMoney(
                    portfolioValue,
                  )
                : "--"
            }
          />

          <MetricCard
            label="Debt"
            value={
              portfolio
                ? formatMoney(debt)
                : "--"
            }
          />

          <MetricCard
            label="Current LTV"
            value={
              portfolio
                ? `${currentLTV.toFixed(
                    2,
                  )}%`
                : "--"
            }
          />

          <MetricCard
            label="Risk Threshold"
            value={
              portfolio
                ? `${riskThreshold.toFixed(
                    2,
                  )}%`
                : "--"
            }
          />
        </section>

        <section
          className={`mt-6 rounded-2xl border p-6 ${
            risk?.riskLevel === "HIGH"
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
                className={`mt-2 text-3xl font-semibold ${
                  risk?.riskLevel ===
                  "HIGH"
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

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              AI Risk Analysis
            </p>

            <p className="mt-4 leading-7 text-slate-200">
              {risk?.summary ??
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
            Live Infrastructure
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatusItem
              label="Chainlink CRE"
              status="Operational"
            />

            <StatusItem
              label="Ethereum Sepolia"
              status={
                portfolio
                  ? "Connected"
                  : "Unavailable"
              }
            />

            <StatusItem
              label="AI Risk Analyst"
              status={
                risk
                  ? "Online"
                  : "Unavailable"
              }
            />
          </div>
        </section>

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
