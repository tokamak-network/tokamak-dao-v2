import { AirdropSimulator } from "@/components/simulation/AirdropSimulator";

export default function AirdropSimulatorPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          vTON Airdrop Simulator
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Simulate airdrop distribution across stakers.
        </p>
      </div>

      <AirdropSimulator />
    </div>
  );
}
