import { WalletConnect } from "@/components/WalletConnect";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Simple dApp
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Connect your wallet to get started
        </p>
        <WalletConnect />
      </main>
    </div>
  );
}
