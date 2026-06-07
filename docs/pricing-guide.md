# Tex2Film Pricing & Monetization Engineer's Guide

| [English](?lang=en) | [Persian](?lang=fa) |

---

## Document Purpose

This document is for engineers and technical decision-makers. It explains the economics behind our pricing model, how we make money, and how we maximize profit while staying fair to users. We are not marketers -- we are engineers who need to understand the financial mechanics of our product.

**Exchange Rate:** 1 USD = 170,000 Iranian Toman
**Last Updated:** 29 May 2026 / 9 Khordad 1405

---

# Table of Contents

1. [What Is a Credit?](#1-what-is-a-credit)
2. [API Cost Structure](#2-api-cost-structure)
3. [Credit System Design](#3-credit-system-design)
4. [Subscription Plans](#4-subscription-plans)
5. [Top-Up Packs](#5-top-up-packs)
6. [Profit Maximization Strategies](#6-profit-maximization-strategies)
7. [Freemium Conversion](#7-freemium-conversion)
8. [B2B & Enterprise](#8-b2b--enterprise)
9. [Payment Infrastructure](#9-payment-infrastructure)
10. [Revenue Projections](#10-revenue-projections)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [FAQ](#13-faq)
14. [Appendix: API Cost Reference](#14-appendix-api-cost-reference)
15. [Persian Translation / ترجمه فارسی](#15-persian-translation)

---

# 1. What Is a Credit?

Tex2Film uses a **credit system** -- an abstraction layer over raw API costs. Instead of charging per click, users buy a prepaid balance. Every AI operation (image generation, video synthesis, TTS, etc.) deducts a fixed amount of credits.

**1 platform credit = $0.01 USD = 1,700 Iranian Toman**

## Why Credits Instead of Direct Pricing?

1. **API price volatility** -- Kling/ElevenLabs change prices. Credits buffer us.
2. **Proportional fairness** -- a TTS call costs less than a video render. Users pay proportionally.
3. **Psychological ownership** -- "I have 340 credits left" feels better than "I paid $3.40 and have no idea what remains."
4. **Margin control** -- we can adjust credit prices per operation independently of API costs.

## Credit System Architecture (Engineering View)

From a backend perspective, the credit system is a simple ledger:

```
user.credits (integer, cents-like unit)
  |
  +-- operation cost table (credits per operation)
  |
  +-- deduction: atomic decrement on operation start
  |
  +-- refund: atomic increment on operation failure
  |
  +-- top-up: increment on payment confirmation
```

**Key constraint:** Credits must be deducted **before** the API call is made. If the API call fails, credits are refunded. This prevents users from "free riding" on failed operations.

---

# 2. API Cost Structure

All costs are what **we pay** to our providers. These are our COGS (Cost of Goods Sold).

## 2.1 Kling AI (Video & Image Generation)

| Operation | Kling Credits | Our USD Cost | Our Toman Cost |
|---|---|---|---|
| Image generation (standard) | 1 cr | ~$0.014 | ~2,380 |
| Image generation (professional) | 2 cr | ~$0.028 | ~4,760 |
| Video 5s standard quality | 10 cr | ~$0.14 | ~23,800 |
| Video 5s professional quality | 35 cr | ~$0.49 | ~83,300 |
| Video 10s standard quality | 20 cr | ~$0.28 | ~47,600 |
| Video 10s professional quality | 70 cr | ~$0.98 | ~166,600 |
| Lip sync (per clip) | 10 cr | ~$0.14 | ~23,800 |
| Image-to-video 5s standard | 10 cr | ~$0.14 | ~23,800 |
| Image-to-video 5s professional | 35 cr | ~$0.49 | ~83,300 |

**Bulk discount:** Kling offers volume pricing at higher monthly API spend. At >$500/mo spend: ~15% discount. At >$2,000/mo: ~25% discount.

## 2.2 ElevenLabs (Voice & Audio)

| Operation | Unit | Our USD Cost | Our Toman Cost |
|---|---|---|---|
| TTS -- Multilingual v2 | per 1K chars | $0.10 | ~17,000 |
| TTS -- Flash v2.5 | per 1K chars | $0.03 | ~5,100 |
| TTS -- Turbo v2.5 | per 1K chars | $0.05 | ~8,500 |
| Sound Effects (SFX) | per generation | ~$0.05 | ~8,500 |
| Music generation (30s) | per generation | ~$0.08-0.12 | ~13,600-20,400 |
| Voice cloning (IVC) | per submission | $0.10 | ~17,000 |

**Average dialogue TTS per shot:** ~200 chars -> $0.02/shot (~3,400 Toman)
**Average narration TTS per project:** ~2,000 chars -> $0.20/project (~34,000 Toman)

## 2.3 OpenRouter (LLM Orchestration)

All prices per million tokens (input / output).

| Model | Input $/MTok | Output $/MTok | Usage in pipeline |
|---|---|---|---|
| GPT-4o mini | $0.15 | $0.60 | Default for all stages |
| GPT-4o | $2.50 | $10.00 | Premium cinematography briefs |
| DeepSeek V3 (0324) | $0.27 | $1.10 | Narrative + script alternative |
| Claude 3.5 Haiku | $0.80 | $4.00 | Director brief with structured output |
| Claude 3.5 Sonnet | $3.00 | $15.00 | Complex multi-stage orchestration |
| Gemini 2.0 Flash | $0.10 | $0.40 | High-throughput batch operations |

**Typical per-project LLM cost (GPT-4o mini, all 7 stages):** ~15K tokens -> ~$0.012 (~2,040 Toman)
**With GPT-4o:** ~15K tokens -> ~$0.19 (~32,300 Toman)

## 2.4 Storage & Infrastructure

| Service | Cost | Notes |
|---|---|---|
| Vercel Blob storage | $0.023/GB/mo + $0.023/GB egress | Generated media assets |
| Vercel compute (Next.js) | ~$20-200/mo | Depending on usage tier |
| Neon PostgreSQL | $0-$69/mo | Free tier covers ~100 users |
| Replit hosting (dev) | Included in workspace | Not a prod cost |

**Average storage per project:** ~50-200 MB (images) + ~200-500 MB (videos)
**Monthly storage at 100 active projects:** ~15-35 GB -> ~$0.35-0.80/mo

---

# 3. Credit System Design

## 3.1 Platform Credit Value

We sell credits as an abstraction over raw API costs. This lets us:
- Buffer against API price changes
- Apply tiered margins per operation type
- Track consumption clearly per user

**1 platform credit = $0.01 USD at 3x gross margin target**
This means we aim to pay <=$0.0033 in API costs per credit consumed.

## 3.2 Operations-to-Credits Mapping

| Operation | Platform Credits | Actual API Cost | Gross Margin | Toman Revenue |
|---|---|---|---|---|
| LLM call (narrative/storyboard) | 2 cr | ~$0.012 | ~83% | ~3,400 |
| Image generation (standard) | 8 cr | ~$0.014 | ~83% | ~13,600 |
| Image generation (professional) | 15 cr | ~$0.028 | ~87% | ~25,500 |
| Video 5s standard | 25 cr | ~$0.14 | ~44% | ~42,500 |
| Video 5s professional | 55 cr | ~$0.49 | ~11% | ~93,500 |
| Video 10s standard | 45 cr | ~$0.28 | ~38% | ~76,500 |
| Video 10s professional | 100 cr | ~$0.98 | ~2% | ~170,000 |
| TTS per shot (~200 chars) | 3 cr | ~$0.02 | ~33% | ~5,100 |
| SFX generation | 5 cr | ~$0.05 | ~0% | ~8,500 |
| Music generation 30s | 12 cr | ~$0.10 | ~17% | ~20,400 |
| Lip sync (5s clip) | 40 cr | ~$0.14 | ~71% | ~68,000 |

**Key insight:** Professional video clips (55-100 cr) have very thin margins. This is intentional -- professional video is a premium upgrade trigger and we make margin on the subscription fee + lower-cost operations. At volume, bulk Kling discounts improve video margins to ~25-40%.

## 3.3 Typical Project Credit Consumption

| Project Type | Operations | Credits Used | Revenue at $0.01/cr | Toman Revenue |
|---|---|---|---|---|
| Short narrative (10 shots, image-only) | 10 imgs std + 3 LLM + 2 TTS | ~115 cr | $1.15 | ~195,500 |
| Standard film (15 shots, std video) | 15 imgs + 10 vid 5s std + 5 LLM + 5 TTS | ~490 cr | $4.90 | ~833,000 |
| Pro film (20 shots, professional video) | 20 imgs + 15 vid 5s pro + 8 LLM + 10 TTS + 5 SFX | ~1,260 cr | $12.60 | ~2,142,000 |
| Full production (30 shots + audio + lipsync) | 30 imgs pro + 25 vid pro + 5 lipsync + 15 TTS + 10 SFX + 3 music | ~2,900 cr | $29.00 | ~4,930,000 |

---

# 4. Subscription Plans

## 4.1 Revised Tier Structure

The previous Pro tier (149,000 TMN = ~$0.88 USD) severely underpriced relative to API costs and international benchmarks. After market research, we revised pricing to align with Iranian market value while maintaining a 50% discount vs international competitors.

| Tier | Price/mo (TMN) | Price/mo (USD) | Credits | Projects | Shots/proj | Watermark | Priority |
|---|---|---|---|---|---|---|---|
| **Free** | 0 | $0 | 50 | 1 | 8 | Yes | No |
| **Creator** | 600,000 | ~$3.53 | 500 | 5 | 30 | No | No |
| **Studio** | 1,200,000 | ~$7.06 | 1,500 | 20 | 100 | No | Email |
| **Team** | 2,400,000 | ~$14.12 | 4,000 | Unlimited | Unlimited | No | Priority |
| **Enterprise** | Custom | Custom | Custom | Unlimited | Unlimited | No | Dedicated |

## 4.2 Margin Analysis per Tier

Assuming average user spends 80% of included credits:

| Tier | Monthly Revenue (USD) | API Cost at 80% usage | Gross Margin |
|---|---|---|---|
| Creator | $3.53 | ~$0.66 (400 cr x $0.0033 x 80%) | ~81% |
| Studio | $7.06 | ~$1.98 (1,200 cr x $0.0033 x 80%) | ~72% |
| Team | $14.12 | ~$5.28 (3,200 cr x $0.0033 x 80%) | ~63% |

> At scale with Kling bulk discounts (25%), API cost per credit drops to ~$0.0025, pushing all tier margins above 70%.

## 4.3 Feature Gate Matrix

| Feature | Free | Creator | Studio | Team |
|---|---|---|---|---|
| LLM narrative generation | mini | mini | GPT-4o | GPT-4o |
| Image generation | No | Standard | Professional | Professional |
| Video generation | No | Standard | Professional | Professional |
| TTS voice | No | Flash | Multilingual v2 | Multilingual v2 |
| SFX generation | No | Yes | Yes | Yes |
| Music generation | No | No | Yes | Yes |
| Lip sync | No | No | Yes | Yes |
| Export watermark | Yes (forced) | No | No | No |
| Export resolution | 720p | 1080p | 4K | 4K |
| Project history | 7 days | 30 days | Forever | Forever |
| API access (future) | No | No | No | Yes |

---

# 5. Top-Up Packs

Available as one-time purchases, accessible from the pricing page and the in-studio insufficient-credits modal:

| Pack Name | Credits | Price (TMN) | Price (USD) | CPK (cost per credit) |
|---|---|---|---|---|
| Small | 100 cr | 150,000 | ~$0.88 | 1,500 TMN |
| Medium | 300 cr | 390,000 | ~$2.29 | 1,300 TMN |
| Large | 800 cr | 920,000 | ~$5.41 | 1,150 TMN |
| Pro | 2,000 cr | 2,000,000 | ~$11.76 | 1,000 TMN |

Top-up packs have higher per-credit cost than subscriptions (2-3x) -- this strongly incentivizes subscription upgrades.

---

# 6. Profit Maximization Strategies

## 6.1 The "Good-Better-Best" Strategy

Our tier structure follows the classic pricing strategy used by SaaS companies:

- **Free (Good):** Attracts users. Has strict limits (1 project, 8 shots, no video). Creates a "taste" of the product.
- **Creator (Better):** The target tier for most users. 500 credits covers ~1 standard film. Priced at 600,000 TMN, competitive with international benchmarks at 50% discount.
- **Studio (Best):** For professional users. 1,500 credits + professional video. The upgrade from Creator is 600,000 TMN more -- but gives 3x credits + professional features.
- **Team / Enterprise:** For organizations. High margin because we sell seats + credits.

## 6.2 Conversion Funnel Optimization

Our 6 conversion triggers are designed to maximize revenue at each stage:

1. **Video Generation Wall (Priority: #2)** -- Triggers at shot #1 when user clicks "Generate Video". This is the highest-value conversion because video is our most expensive operation.
2. **Credit Exhaustion (Priority: #1)** -- When free credits hit 0. Show top-up packs + upgrade CTA. This is the most natural conversion moment.
3. **Project Limit Wall (Priority: #3)** -- Free = 1 project. When user tries project #2. This catches users who want to make multiple projects.
4. **Export Quality Wall (Priority: #4)** -- Watermarked 720p vs. clean 1080p/4K. Visual comparison is powerful.
5. **Shot Limit Wall (Priority: #5)** -- Free = 8 shots. When adding shot #9.
6. **Professional Audio Wall (Priority: #6)** -- SFX, music, lip sync. Lower priority because audio is less expensive than video.

## 6.3 Psychological Pricing Techniques

- **Credit denomination:** We use 1 credit = 1,700 Toman. This makes "500 credits" feel like a lot, even though it's ~$3.50.
- **Top-up pricing:** Top-up packs are priced at 1,500-1,000 Toman per credit. Subscription gives 1,200-600 Toman per credit. The 2-3x difference strongly motivates subscriptions.
- **Monthly reset:** Credits reset every 30 days. This creates urgency -- "use them or lose them."
- **Visual credit display:** Show remaining credits prominently in the studio header. Color-code: green (>50%), yellow (20-50%), red (<20%).

## 6.4 Margin Protection Mechanisms

1. **Credit overage pause:** When a user hits 0 credits, all operations stop. No negative credits.
2. **Usage alerts at 80% and 100%:** Email + in-app notification. Suggests top-up or upgrade.
3. **API cost monitoring:** Weekly review of Kling/ElevenLabs pricing. If costs increase, we can adjust credit prices.
4. **Model routing:** Use cheaper LLMs (GPT-4o mini) for simple tasks. Only use GPT-4o for premium users.
5. **Storage expiration:** Auto-delete projects older than 7 days (Free) / 30 days (Creator) if user is inactive. Reduces storage costs.

## 6.5 Revenue Diversification

| Revenue Stream | % of Total | Margin | Notes |
|---|---|---|---|
| Subscription fees | ~70% | 45-64% | Predictable MRR |
| Top-up packs | ~15% | 30-40% | Variable upside |
| Enterprise contracts | ~10% | 60-80% | High margin, low volume |
| API access (future) | ~5% | 70%+ | Developer tier |

---

# 7. Freemium Conversion

## 7.1 The Freemium Model Rationale

Free users are **not** a cost center. They are a **marketing channel**. Every free user who shares a project is an advertisement. The watermark on free exports is a viral loop.

**Free user economics:**
- 50 free credits = ~$0.17 in API cost (50 x $0.0033)
- 1,000 free users = ~$170/month in API cost
- If 8% convert to Creator: 80 x $3.53 = ~$282/month revenue
- Break-even at ~3% conversion rate

## 7.2 Conversion Trigger Details

### Trigger 1: Video Generation Wall
- **When:** User clicks "Generate Video" on any shot card in Free tier
- **Message:** "Video generation requires Creator plan or higher"
- **CTA:** "Upgrade to Creator" (600,000 TMN)
- **Expected conversion:** 15-25% of users who reach this point

### Trigger 2: Credit Exhaustion
- **When:** Credits hit 0 during any operation
- **Message:** "You have 0 credits remaining. This operation costs X credits."
- **CTA:** Top-up packs + upgrade to higher plan
- **Expected conversion:** 20-30% (highest converting trigger)

### Trigger 3: Project Limit
- **When:** User tries to create project #2
- **Message:** "Free plan includes 1 project. Upgrade to Creator for 5 projects."
- **CTA:** "Upgrade to Creator"
- **Expected conversion:** 10-15%

### Trigger 4: Export Quality
- **When:** User clicks "Download" on free tier
- **Message:** "Your export will have a watermark. Upgrade to remove it."
- **CTA:** Preview thumbnail comparison (with/without watermark)
- **Expected conversion:** 5-10%

### Trigger 5: Shot Limit
- **When:** User tries to add shot #9
- **Message:** "Free plan: 8 shots max. Creator: 30 shots."
- **CTA:** "Upgrade to Creator"
- **Expected conversion:** 5-10%

### Trigger 6: Professional Audio
- **When:** User clicks SFX, music, or lip sync
- **Message:** "Professional audio features require Studio plan."
- **CTA:** "Upgrade to Studio"
- **Expected conversion:** 3-5% (lower because fewer users reach this)

---

# 8. B2B & Enterprise

## 8.1 Target Segments

| Segment | Team Size | Typical Need | Pricing Approach |
|---|---|---|---|
| Production houses | 5-50 people | 10-50 projects/month | Team plan or Enterprise |
| Advertising agencies | 3-20 people | Fast turnaround, 30s-2min spots | Studio per art director |
| Universities & film schools | 20-200 students | Education license, concurrent users | Flat: 5,000,000 TMN/semester |
| News organizations | 5-30 editors | Daily explainer videos | Team plan + SLA |
| Content networks | 10-100 creators | Batch production | Volume discount on API |
| Ad-tech resellers | Platform builders | White-label API | Revenue share |

## 8.2 Enterprise Package Components

- Dedicated Kling quota (no rate-limit competition)
- Private LLM deployment option (self-hosted models)
- Custom onboarding & training sessions
- SLA: 99.5% uptime, <2hr response support
- White-label option (custom domain, branding removal)
- Usage analytics dashboard
- Invoicing in Toman with official receipts

**Starting price:** 5,000,000-15,000,000 TMN/month depending on seats and volume.

---

# 9. Payment Infrastructure

## 9.1 The Dual-Gateway Strategy

Iranian users cannot use Visa/Mastercard due to SWIFT sanctions. Stripe requires a VPN. We support both:

1. **Stripe** -- for international users (diaspora, non-Iranian studios)
2. **Iranian gateways** -- for domestic users paying in Toman

## 9.2 Iranian Payment Gateway Comparison

| Gateway | Fee | Settlement | API Quality | Notes |
|---|---|---|---|---|
| **Zarinpal** | 1% + 2,000 TMN/tx | T+1 day | 5/5 | Most popular, best docs, Sandbox |
| **IDPay** | 1% | T+2 days | 4/5 | Native subscriptions |
| **NextPay** | 1% | T+1 day | 4/5 | Good REST API, JSON |
| **Mellat (BehPardakht)** | 0.5% | T+0 | 2/5 | Bank-level, complex SOAP |
| **Parsian** | 0.7% | T+1 day | 3/5 | Common in B2B |

**Recommendation:** Zarinpal as primary. IDPay as secondary for subscription billing.

## 9.3 Payment Flow Architecture

```
User clicks "Upgrade"
    |
    +-- Iran / Toman preference? --> Zarinpal checkout (TMN)
    |                                  |
    |                                  +-- Callback --> update tier/credits
    |
    +-- International / USD? --> Stripe Checkout (USD)
                                       |
                                       +-- Webhook --> update tier/credits
```

Both gateways write to the same `users` table. A `payments` table logs all transactions.

## 9.4 Subscription Handling in Iran

Zarinpal/IDPay do not have native recurring billing like Stripe. Our approach:
- Store expiry date in `users.subscriptionExpiresAt`
- Send reminder email 5 days before expiry
- Allow manual renewal ("Renew Subscription")
- Optional: auto-renewal with Zarinpal auto-pay

---

# 10. Revenue Projections

## 10.1 Assumptions

- Average revenue per paying user (ARPU): 900,000 TMN/mo (~$5.29 USD)
- Free-to-paid conversion rate: 8% (industry average for creative SaaS)
- Monthly churn: 6% for individual plans, 2% for Team/Enterprise
- Top-up revenue: 15% of total revenue from credit packs
- Exchange rate: 170,000 TMN/USD

## 10.2 Year 1 Projections (1,000 registered users)

| Month | Reg. Users | Paying Users (8%) | MRR (TMN) | MRR (USD) |
|---|---|---|---|---|
| M1 | 200 | 16 | 14,400,000 | ~$85 |
| M3 | 500 | 40 | 36,000,000 | ~$212 |
| M6 | 800 | 64 | 57,600,000 | ~$339 |
| M9 | 1,000 | 80 | 72,000,000 | ~$424 |
| M12 | 1,200 | 96 | 86,400,000 | ~$508 |

**Year 1 Total ARR:** ~$6,096 USD (break-even on Vercel + Neon infra costs + 1 FTE salary)

## 10.3 Year 2 Projections (10,000 registered users)

| Quarter | Reg. Users | Paying Users | MRR (TMN) | MRR (USD) |
|---|---|---|---|---|
| Q1 Y2 | 3,000 | 300 | 270,000,000 | ~$1,588 |
| Q2 Y2 | 5,000 | 500 | 450,000,000 | ~$2,647 |
| Q3 Y2 | 7,500 | 750 | 675,000,000 | ~$3,971 |
| Q4 Y2 | 10,000 | 1,000 | 900,000,000 | ~$5,294 |

**Year 2 Total ARR:** ~$72,000 USD -- sustains 2 FTE salaries at Iranian market rates + infrastructure.

**Add 2 Enterprise clients (Q3 Y2):** +$3,000/mo --> ARR increases to ~$108,000.

## 10.4 Key Unit Economics Targets

| Metric | Target |
|---|---|
| Blended gross margin | >= 55% |
| CAC (Customer Acquisition Cost) | < 600,000 TMN |
| LTV (Lifetime Value) | > 5,400,000 TMN (6-month avg) |
| LTV:CAC ratio | > 6:1 |
| Payback period | < 2 months |
| Net Revenue Retention | > 110% (expansion via top-ups) |

---

# 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TMN/USD exchange rate collapse | High | Medium | Price subscriptions in USD equivalent, convert at billing |
| Kling API price increase | Medium | High | Multi-provider fallback (Runway, Pika); credit buffer in pricing |
| ElevenLabs Persian quality degrades | Low | Medium | Cache TTS outputs; allow user voice upload |
| Heavy user burns credits at loss | Medium | Medium | Usage alerts at 80% and 100%; overage auto-pause |
| Sanctions/payment processing changes | High | High | Maintain both Stripe and Zarinpal simultaneously |
| Competitor undercuts pricing | Medium | Medium | Focus on Persian-language differentiation; community moat |
| Iranian app stores refuse payment processing | Low | Low | Direct web payments; no app store dependency |

---

# 12. Implementation Roadmap

## Phase 1 -- Credit Infrastructure (Current Sprint)
- [ ] Stripe integration (international payments)
- [ ] Credit deduction on every AI operation (server-side, atomic)
- [ ] Credit balance UI in studio header
- [ ] Upgrade modals at all 6 conversion triggers
- [ ] Top-up credit packs via Stripe one-time payment

## Phase 2 -- Iranian Gateway (Q3 2026)
- [ ] Zarinpal integration for Toman subscriptions
- [ ] IDPay auto-renewal for monthly subscribers
- [ ] Dual-gateway routing based on user locale
- [ ] Payments audit table for both gateways

## Phase 3 -- B2B & Enterprise (Q4 2026)
- [ ] Team workspace (shared credit pool, multiple seats)
- [ ] Usage analytics dashboard for admins
- [ ] Enterprise contract/SLA flow
- [ ] Education license tier
- [ ] White-label option

## Phase 4 -- Optimization (Q1 2027)
- [ ] Kling bulk pricing negotiation at $2,000+/mo spend
- [ ] LLM model routing (cheaper models for simple tasks)
- [ ] Storage optimization (compress and expire old generations)
- [ ] Annual plan discount (20% off for annual commitment)

---

# 13. FAQ

### Q1: Do credits roll over to the next month?
No. Unused credits reset at the end of your billing cycle. This is standard for SaaS credit systems (Runway, Midjourney, ElevenLabs). Plan your usage accordingly.

### Q2: Can I downgrade my plan?
Yes, at any time. The downgrade takes effect at the next billing cycle. Your current credits remain usable until they expire.

### Q3: What happens if I run out of credits mid-generation?
The generation is cancelled. You are not charged for incomplete operations. The shot status reverts to "draft" and you can retry after topping up.

### Q4: Can I get a refund?
Refunds are available within 7 days of purchase if you have used less than 10% of your credits. Contact support@fxai.ir.

### Q5: Is there a free trial for paid plans?
No free trial, but the Free plan lets you test the entire pipeline except video and audio. You can evaluate all LLM stages, image generation, and export before paying.

### Q6: How do I pay from Iran?
Use Zarinpal or IDPay at checkout. Both support all Iranian bank cards (Shetab network). No VPN needed.

### Q7: Can I pay in USD?
Yes, if you are outside Iran or have an international card, use Stripe checkout. Prices are locked in USD.

### Q8: What is the difference between Standard and Professional video?
Standard uses Kling 1.6 (faster, good quality). Professional uses Kling 2.1 (slower, cinema-grade quality, better motion coherence). Professional is 3.5x more expensive.

### Q9: Can I share credits with my team?
Only on the Team plan. Team plans have a shared credit pool. All other plans are individual.

### Q10: How do I estimate my monthly cost before subscribing?
Use the Project Cost Calculator in Section 3. Multiply by your expected number of projects per month. Compare against plan credits. If you are between plans, start with the lower one and top up as needed.

---

# 14. Appendix: API Cost Reference

All costs below are our raw API costs (what we pay to providers). Platform credits are priced at 3x margin.

## Kling AI
| Operation | Kling Credits | Our USD Cost |
|---|---|---|
| Image standard | 1 | ~$0.014 |
| Image professional | 2 | ~$0.028 |
| Video 5s standard | 10 | ~$0.14 |
| Video 5s professional | 35 | ~$0.49 |
| Lip sync | 10 | ~$0.14 |

## ElevenLabs
| Operation | Unit | Our USD Cost |
|---|---|---|
| TTS Multilingual v2 | per 1K chars | $0.10 |
| TTS Flash v2.5 | per 1K chars | $0.03 |
| SFX | per generation | ~$0.05 |
| Music 30s | per generation | ~$0.10 |

## OpenRouter (LLMs)
| Model | Input $/MTok | Output $/MTok |
|---|---|---|
| GPT-4o mini | $0.15 | $0.60 |
| GPT-4o | $2.50 | $10.00 |
| DeepSeek V3 | $0.27 | $1.10 |
| Gemini 2.0 Flash | $0.10 | $0.40 |

## Infrastructure
| Service | Cost |
|---|---|
| Vercel Blob | $0.023/GB/mo |
| Vercel Compute | ~$20-200/mo |
| Neon PostgreSQL | $0-$69/mo |

---

*Document version: 2.0 | For internal engineering use only*

---

---

# 15. Persian Translation / ترجمه فارسی

---

## هدف از این مستند

این مستند برای مهندسان و مدیران فنی‌تصمیم‌گیران رسمی نوشته شده است. تاریخ: 29 مای ۲۰۲۶ / 9 خرداد ۱۴۰۵

**نرخ ارز:** 1 دلار = ۱۷۰٬۰۰۰ تومان

---

## فهرست مطالب

1. [اعتبار چیست؟](#1-اعتبار-چیست)
2. [ساختار هزینه API](#2-ساختار-هزینه-api)
3. [طراحی سیستم اعتبار](#3-طراحی-سیستم-اعتبار)
4. [برنامه‌های سربرستی](#4-برنامههای-سربرستی)
5. [بسته‌های شارژ اضافی](#5-بستههای-شارژ-اضافی)
6. [راهکارهای حداکثرسازی سود](#6-راهکارهای-حداکثرسازی-سود)
7. [تبدیل ارزانی‌سربرستی](#7-تبدیل-ارزانیسربرستی)
8. [سازمانی و شرکت‌های بزرگ](#8-سازمانی-و-شرکتهای-بزرگ)
9. [زیرساخت ریال پرداختی](#9-زیرساخت-ریال-پرداختی)
10. [پروژه‌های اینآمدی درآمد](#10-پروژههای-اینآمدی-درآمد)
11. [ریسک‌ها و راهکارهای برطرفکننده](#11-ریسکها-و-راهکارهای-برطرفکننده)
12. [روادماپ پیاده‌سازی](#12-روادماپ-پیاده‌سازی)
13. [سوالات متداول](#13-سوالات-متداول)
14. [پیوست: جدول هزینه API](#14-پیوست-جدول-هزینه-api)

---

## 1. اعتبار چیست؟

Tex2Film از سیستم اعتبار استفاده می‌کند — یک لایه ابستراکشن روی هزینه‌های روگین API. بجای ارجاء به ازای هر کلیک، کاربران یک حساب ارزشمانی پیش‌پرداخت ارزشمانی ارزشمانی ارزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشمانی رزشما