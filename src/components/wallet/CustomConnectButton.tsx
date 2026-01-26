"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { NetworkButton } from "./NetworkButton";
import { AccountButton } from "./AccountButton";

/**
 * CustomConnectButton - RainbowKit 공식 패턴 사용
 */
export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={openConnectModal}
                  >
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    variant="destructive"
                    size="md"
                    onClick={openChainModal}
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <NetworkButton
                    chainName={chain.name ?? "Unknown"}
                    chainIcon={chain.iconUrl}
                    hasIcon={chain.hasIcon}
                    onClick={openChainModal}
                  />
                  <AccountButton
                    address={account.address}
                    displayAddress={account.displayName}
                    ensAvatar={account.ensAvatar}
                    onClick={openAccountModal}
                  />
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
