"use client";

import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { NetworkButton } from "./NetworkButton";
import { AccountButton } from "./AccountButton";

/**
 * CustomConnectButton - AppKit hooks 사용
 */
export function CustomConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();

  const ready = status !== "connecting" && status !== "reconnecting";

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
        if (!isConnected || !address) {
          return (
            <Button
              variant="primary"
              size="md"
              onClick={() => open({ view: "Connect" })}
            >
              Connect Wallet
            </Button>
          );
        }

        if (!caipNetwork) {
          return (
            <Button
              variant="destructive"
              size="md"
              onClick={() => open({ view: "Networks" })}
            >
              Wrong network
            </Button>
          );
        }

        // Format display address (truncate)
        const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const chainIcon = caipNetwork.assets?.imageUrl;

        return (
          <div className="flex items-center gap-2">
            <NetworkButton
              chainName={caipNetwork.name ?? "Unknown"}
              chainIcon={chainIcon}
              hasIcon={!!chainIcon}
              onClick={() => open({ view: "Networks" })}
            />
            <AccountButton
              address={address}
              displayAddress={displayAddress}
              onClick={() => open({ view: "Account" })}
            />
          </div>
        );
      })()}
    </div>
  );
}
