import type { ScreenContext } from "./types";

const screenContexts: Record<string, ScreenContext> = {
  "/proposals": {
    route: "/proposals",
    pageTitle: "Governance Proposals",
    description: "List of all governance proposals in Tokamak DAO",
    suggestedQuestions: [
      "What proposals are currently active?",
      "How does the voting process work?",
      "What is the quorum requirement?",
      "I want to create a new Agenda",
    ],
  },
  "/proposals/create": {
    route: "/proposals/create",
    pageTitle: "Create Proposal",
    description: "Create a new governance proposal for Tokamak DAO",
    mode: "make_proposal",
    suggestedQuestions: [
      "I want to change the DAO seigniorage rate",
      "I want to approve TON usage from DAOVault",
      "I want to change the DAO quorum",
    ],
  },
  "/voters": {
    route: "/voters",
    pageTitle: "Delegates",
    description: "List of delegates who can vote on proposals",
    suggestedQuestions: [
      "Who are the top delegates by voting power?",
      "How do I delegate my tokens?",
      "What is the current delegation distribution?",
    ],
  },
  "/dashboard": {
    route: "/dashboard",
    pageTitle: "Dashboard",
    description: "Overview of Tokamak DAO governance metrics and status",
    suggestedQuestions: [
      "What is the current treasury balance?",
      "How many active proposals are there?",
      "What are the key governance parameters?",
    ],
  },
  "/faucet": {
    route: "/faucet",
    pageTitle: "Faucet",
    description: "Token faucet for testing governance participation",
    suggestedQuestions: [
      "How do I get test tokens?",
      "What tokens are available from the faucet?",
      "How much can I claim at once?",
    ],
  },
  "/security-council": {
    route: "/security-council",
    pageTitle: "Security Council",
    description: "Security Council management and veto operations",
    suggestedQuestions: [
      "What is the Security Council's role?",
      "How does the veto mechanism work?",
      "Who are the current SC members?",
    ],
  },
  "/vton-issuance-simulator": {
    route: "/vton-issuance-simulator",
    pageTitle: "vTON Issuance Simulator",
    description: "Simulate vTON token issuance scenarios",
    suggestedQuestions: [
      "How does vTON issuance work?",
      "What parameters affect issuance?",
      "How is the issuance rate calculated?",
    ],
  },
  "/sc-action-simulator": {
    route: "/sc-action-simulator",
    pageTitle: "SC Action Simulator",
    description: "Simulate Security Council actions and proposals",
    suggestedQuestions: [
      "What actions can the SC perform?",
      "How do I simulate a veto?",
      "What is the SC approval threshold?",
    ],
  },
};

const defaultContext: ScreenContext = {
  route: "/",
  pageTitle: "Tokamak DAO",
  description: "Tokamak Network DAO governance platform",
  suggestedQuestions: [
    "What is Tokamak DAO?",
    "How can I participate in governance?",
    "What proposals are currently active?",
  ],
};

export function getScreenContext(pathname: string): ScreenContext {
  // Exact match
  if (screenContexts[pathname]) {
    return screenContexts[pathname];
  }

  // Proposal detail page
  if (pathname.startsWith("/proposals/")) {
    return {
      route: pathname,
      pageTitle: "Proposal Detail",
      description: "Detailed view of a specific governance proposal",
      suggestedQuestions: [
        "Can you summarize this proposal?",
        "What are the voting results so far?",
        "When does voting end?",
        "I want to create a new Agenda based on this proposal",
      ],
    };
  }

  // Match by prefix
  for (const [route, context] of Object.entries(screenContexts)) {
    if (pathname.startsWith(route + "/")) {
      return { ...context, route: pathname };
    }
  }

  return { ...defaultContext, route: pathname };
}
