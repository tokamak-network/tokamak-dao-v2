"use client";

import {
  Button,
  IconButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatusBadge,
  Progress,
  VotingProgress,
  Avatar,
  AvatarFallback,
  AddressAvatar,
  StatCard,
  Input,
  Textarea,
  Label,
  HelperText,
  DelegateCard,
  ProposalCard,
} from "@/components/ui";

const WalletIcon = () => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const SearchIcon = () => (
  <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const PlusIcon = () => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary-600)] focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <header role="banner" className="sticky top-0 z-50 border-b border-[var(--border-secondary)] bg-[var(--surface-primary)]">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[var(--color-primary-600)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Tokamak DAO
            </span>
          </div>
          <Button>
            <WalletIcon />
            Connect wallet
          </Button>
        </div>
      </header>

      <main id="main-content" className="container py-12">
        <div className="max-w-5xl mx-auto space-y-16">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Colors</h2>
              <p className="text-[var(--text-secondary)] mt-1">Brand and semantic colors</p>
            </div>

            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Primary</h3>
                  <div className="flex gap-2 flex-wrap">
                    {[500, 600, 700].map((shade) => (
                      <div key={shade} className="text-center">
                        <div
                          className="size-14 rounded-xl shadow-sm"
                          style={{ background: `var(--color-primary-${shade})` }}
                        />
                        <span className="text-xs text-[var(--text-tertiary)] mt-1 block">{shade}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Semantic</h3>
                  <div className="flex gap-4 flex-wrap">
                    <div className="text-center">
                      <div className="size-14 rounded-xl bg-[var(--color-success-500)]" />
                      <span className="text-xs text-[var(--text-tertiary)] mt-1 block">Success</span>
                    </div>
                    <div className="text-center">
                      <div className="size-14 rounded-xl bg-[var(--color-error-500)]" />
                      <span className="text-xs text-[var(--text-tertiary)] mt-1 block">Error</span>
                    </div>
                    <div className="text-center">
                      <div className="size-14 rounded-xl bg-[var(--color-vote-for)]" />
                      <span className="text-xs text-[var(--text-tertiary)] mt-1 block">For</span>
                    </div>
                    <div className="text-center">
                      <div className="size-14 rounded-xl bg-[var(--color-vote-against)]" />
                      <span className="text-xs text-[var(--text-tertiary)] mt-1 block">Against</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Buttons</h2>
              <p className="text-[var(--text-secondary)] mt-1">Variants and states</p>
            </div>

            <Card>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Variants</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="success">Success</Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">With Icons</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button leftIcon={<WalletIcon />}>Connect wallet</Button>
                    <Button variant="secondary" rightIcon={<ArrowRightIcon />}>View all</Button>
                    <IconButton icon={<SearchIcon />} aria-label="Search" variant="secondary" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">States</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button loading>Loading…</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Badges</h2>
              <p className="text-[var(--text-secondary)] mt-1">Status indicators</p>
            </div>

            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Variants</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Proposal Status</h3>
                  <div className="flex flex-wrap gap-3 items-center">
                    <StatusBadge status="active" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="executed" />
                    <StatusBadge status="defeated" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Cards</h2>
              <p className="text-[var(--text-secondary)] mt-1">Content containers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>Default card style</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--text-secondary)]">Card content goes here.</p>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Elevated Card</CardTitle>
                  <CardDescription>Enhanced shadow</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Delegates"
                value="114"
                description="132 token holders"
              />
              <StatCard
                label="Proposals"
                value="79"
                description="No active proposals"
              />
              <StatCard
                label="Treasury"
                value="N/A"
                description="1 treasury source"
              />
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Progress</h2>
              <p className="text-[var(--text-secondary)] mt-1">Voting progress bars</p>
            </div>

            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-3 max-w-lg">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Default</h3>
                  <Progress value={60} />
                </div>

                <div className="space-y-3 max-w-lg">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Voting</h3>
                  <VotingProgress forVotes={47} againstVotes={30} abstainVotes={10} showLabels />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Avatars</h2>
              <p className="text-[var(--text-secondary)] mt-1">Auto-generated from address</p>
            </div>

            <Card>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sizes</h3>
                  <div className="flex items-center gap-4">
                    <Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
                    <Avatar size="md"><AvatarFallback>MD</AvatarFallback></Avatar>
                    <Avatar size="lg"><AvatarFallback>LG</AvatarFallback></Avatar>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Address Avatars</h3>
                  <div className="flex items-center gap-4">
                    <AddressAvatar address="0xE1cA7167891F38A0c3Dc7A4F7b8e6D23c21F3456" size="lg" />
                    <AddressAvatar address="0x20Ef5434A678B9cDFBda4321098F7654321ABCDE" size="lg" />
                    <AddressAvatar address="0x6dAD77a0F4567890123456789ABCDEF12345678" size="lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Inputs</h2>
              <p className="text-[var(--text-secondary)] mt-1">Form input elements</p>
            </div>

            <Card>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <div className="space-y-2">
                    <Label htmlFor="default-input">Default Input</Label>
                    <Input id="default-input" name="default" placeholder="Enter value…" autoComplete="off" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-input">Search</Label>
                    <Input id="search-input" name="search" placeholder="Search…" leftIcon={<SearchIcon />} autoComplete="off" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="error-input">With Error</Label>
                    <Input id="error-input" name="error" error placeholder="Invalid input" autoComplete="off" aria-invalid="true" aria-describedby="error-help" />
                    <HelperText id="error-help" error>This field has an error</HelperText>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disabled-input">Disabled</Label>
                    <Input id="disabled-input" name="disabled" disabled placeholder="Disabled input" autoComplete="off" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description-textarea">Textarea</Label>
                    <Textarea id="description-textarea" name="description" placeholder="Enter description…" aria-describedby="textarea-help" />
                    <HelperText id="textarea-help">Maximum 500 characters</HelperText>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Delegate Cards</h2>
              <p className="text-[var(--text-secondary)] mt-1">Delegate information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DelegateCard
                address="0xE1cA7167891F38A0c3Dc7A4F7b8e6D23c21F3456"
                votingPower={30}
                tokenSymbol="TON"
              />
              <DelegateCard
                address="0x1234567890ABCDEF"
                ensName="paromix.eth"
                votingPower={20}
                tokenSymbol="TON"
              />
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-balance">Proposal Cards</h2>
              <p className="text-[var(--text-secondary)] mt-1">Proposals and voting status</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <ProposalCard
                id="1"
                title="Community Treasury Allocation"
                status="active"
                date="Jan 26th, 2026"
                forVotes={47}
                againstVotes={30}
                abstainVotes={10}
                totalVoters={7}
              />
              <ProposalCard
                id="2"
                title="Protocol Upgrade v2.0"
                status="executed"
                date="Jan 15th, 2026"
                forVotes={100}
                againstVotes={30}
                abstainVotes={0}
                totalVoters={9}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
