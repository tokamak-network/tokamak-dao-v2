import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/vTON/vTON";
import { TokenHolder } from "../generated/schema";

const ZERO_ADDRESS = Address.zero();

function getOrCreateHolder(address: Address): TokenHolder {
  let holder = TokenHolder.load(address);
  if (!holder) {
    holder = new TokenHolder(address);
    holder.balance = BigInt.zero();
  }
  return holder;
}

export function handleTransfer(event: Transfer): void {
  const from = event.params.from;
  const to = event.params.to;
  const value = event.params.value;

  // Subtract from sender (skip mint from zero address)
  if (from != ZERO_ADDRESS) {
    const sender = getOrCreateHolder(from);
    sender.balance = sender.balance.minus(value);
    sender.save();
  }

  // Add to receiver (skip burn to zero address)
  if (to != ZERO_ADDRESS) {
    const receiver = getOrCreateHolder(to);
    receiver.balance = receiver.balance.plus(value);
    receiver.save();
  }
}
