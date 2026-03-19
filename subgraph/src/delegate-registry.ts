import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  DelegateRegistered,
  DelegateUpdated,
  DelegateDeactivated,
  DelegateReactivated,
  Delegated,
  Undelegated,
  DelegateVTONBurned,
} from "../generated/DelegateRegistry/DelegateRegistry";
import { Delegate, Delegation, TokenHolder } from "../generated/schema";

function getDelegationId(owner: Address, delegate: Address): Bytes {
  return owner.concat(delegate);
}

function getOrCreateHolder(address: Address): TokenHolder {
  let holder = TokenHolder.load(address);
  if (!holder) {
    holder = new TokenHolder(address);
    holder.balance = BigInt.zero();
    holder.save();
  }
  return holder;
}

export function handleDelegateRegistered(event: DelegateRegistered): void {
  const delegate = new Delegate(event.params.delegate);
  delegate.profile = event.params.profile;
  delegate.votingPhilosophy = event.params.votingPhilosophy;
  delegate.interests = event.params.interests;
  delegate.registeredAt = event.block.timestamp;
  delegate.isActive = true;
  delegate.totalDelegated = BigInt.zero();
  delegate.save();
}

export function handleDelegateUpdated(event: DelegateUpdated): void {
  const delegate = Delegate.load(event.params.delegate);
  if (!delegate) return;
  delegate.profile = event.params.profile;
  delegate.votingPhilosophy = event.params.votingPhilosophy;
  delegate.interests = event.params.interests;
  delegate.save();
}

export function handleDelegateDeactivated(event: DelegateDeactivated): void {
  const delegate = Delegate.load(event.params.delegate);
  if (!delegate) return;
  delegate.isActive = false;
  delegate.save();
}

export function handleDelegateReactivated(event: DelegateReactivated): void {
  const delegate = Delegate.load(event.params.delegate);
  if (!delegate) return;
  delegate.isActive = true;
  delegate.save();
}

export function handleDelegated(event: Delegated): void {
  const owner = event.params.owner;
  const delegateAddr = event.params.delegate;
  const amount = event.params.amount;
  const expiresAt = event.params.expiresAt;

  // Ensure TokenHolder exists
  getOrCreateHolder(owner);

  const delegateEntity = Delegate.load(delegateAddr);
  if (!delegateEntity) return;

  const id = getDelegationId(owner, delegateAddr);
  let delegation = Delegation.load(id);

  if (!delegation) {
    delegation = new Delegation(id);
    delegation.owner = owner;
    delegation.delegate = delegateAddr;
    delegation.amount = BigInt.zero();
  }

  delegation.amount = delegation.amount.plus(amount);
  delegation.delegatedAt = event.block.timestamp;
  delegation.expiresAt = expiresAt;
  delegation.save();

  delegateEntity.totalDelegated = delegateEntity.totalDelegated.plus(amount);
  delegateEntity.save();
}

export function handleUndelegated(event: Undelegated): void {
  const owner = event.params.owner;
  const delegateAddr = event.params.delegate;
  const amount = event.params.amount;

  const delegateEntity = Delegate.load(delegateAddr);
  if (!delegateEntity) return;

  const id = getDelegationId(owner, delegateAddr);
  const delegation = Delegation.load(id);

  if (delegation) {
    delegation.amount = delegation.amount.minus(amount);
    if (delegation.amount.le(BigInt.zero())) {
      // Remove delegation entity when fully undelegated
      // Note: store.remove not available in all versions, set to zero instead
      delegation.amount = BigInt.zero();
    }
    delegation.save();
  }

  delegateEntity.totalDelegated = delegateEntity.totalDelegated.minus(amount);
  if (delegateEntity.totalDelegated.lt(BigInt.zero())) {
    delegateEntity.totalDelegated = BigInt.zero();
  }
  delegateEntity.save();
}

export function handleDelegateVTONBurned(event: DelegateVTONBurned): void {
  const delegateEntity = Delegate.load(event.params.delegate);
  if (!delegateEntity) return;

  delegateEntity.totalDelegated = delegateEntity.totalDelegated.minus(
    event.params.amount
  );
  if (delegateEntity.totalDelegated.lt(BigInt.zero())) {
    delegateEntity.totalDelegated = BigInt.zero();
  }
  delegateEntity.save();
}
