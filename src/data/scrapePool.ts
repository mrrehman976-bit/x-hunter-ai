export interface ScrapeLeadSeed {
  handle: string;
  displayName: string;
  followers: number;
  bio: string;
}

export const scrapePool: ScrapeLeadSeed[] = [
  { handle: '@crypto_founder', displayName: 'Maxwell Reed', followers: 32100, bio: 'Building DeFi protocols. Ex-Goldman. Tweets about crypto markets & on-chain analytics.' },
  { handle: '@web3_jess', displayName: 'Jessica Liu', followers: 54700, bio: 'Web3 product lead @ ChainLab. Passionate about DAOs, governance, and community-driven products.' },
  { handle: '@saas_james', displayName: 'James Okonkwo', followers: 18900, bio: 'Bootstrapping a $1M ARR SaaS. Sharing everything about indie founder journey and MRR growth.' },
  { handle: '@nft_collector', displayName: 'Dmitri Volkov', followers: 78000, bio: 'NFT whale & collector. Art advisor. Early adopter of every new chain.' },
  { handle: '@ai_builder', displayName: 'Kavya Sharma', followers: 41300, bio: 'AI/ML engineer building LLM tools. Ex-OpenAI. Tweeting about model fine-tuning and RAG pipelines.' },
  { handle: '@growth_hacker', displayName: 'Leonardo Fabbri', followers: 96500, bio: 'Growth hacker & startup advisor. Helped 40+ startups scale user acquisition. PLG evangelist.' },
  { handle: '@defi_trader', displayName: 'Sven Bergström', followers: 28600, bio: 'DeFi power user & yield farmer. Building a portfolio tracker for on-chain positions. Alpha leaks.' },
  { handle: '@startup_mike', displayName: 'Michael Asante', followers: 64200, bio: 'Serial founder. 3x exits. Currently building an AI sales assistant. Tweeting founder lessons.' },
  { handle: '@devops_nora', displayName: 'Nora Haddad', followers: 15700, bio: 'Platform engineer & DevRel. Kubernetes, Terraform, CI/CD. Helping teams ship safely and fast.' },
  { handle: '@product_pm', displayName: 'Yuki Tanaka', followers: 39800, bio: 'Product manager @ Flowbase. Writing about product strategy, discovery, and metrics that matter.' },
  { handle: '@blockchain_ron', displayName: 'Ron Keenan', followers: 52100, bio: 'Blockchain architect. Building Layer 2 solutions. Tweets about ZK proofs and rollup tech.' },
  { handle: '@indie_hacker', displayName: 'Camila Souza', followers: 21400, bio: 'Indie hacker. Solo founder of a profitable micro-SaaS. Sharing revenue numbers & build logs.' },
];

export interface SimulatedReply {
  text: string;
  intent: 'interested' | 'query' | 'pricing' | 'objection';
}

export const inboxReplies: SimulatedReply[] = [
  { text: 'Hey! This looks really useful — can you send me a pricing breakdown?', intent: 'pricing' },
  { text: 'Interested. What is the onboarding process like?', intent: 'interested' },
  { text: 'Could you tell me more about the AI personalization side? How does it work?', intent: 'query' },
  { text: 'Timing is good. Let us chat next week. Does Tuesday 2pm PT work?', intent: 'interested' },
  { text: 'Not right now — we already use a similar tool. Maybe revisit in Q1?', intent: 'objection' },
];
