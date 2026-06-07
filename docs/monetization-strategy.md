# Tex2Film — Monetization Strategy & Pricing Architecture

> **Last updated:** May 2026  
> **Status:** Approved for implementation  
> **Covers:** API cost structure, credit system design, subscription tiers, pricing model rationale, freemium conversion, B2B segments, Iranian payment infrastructure, 2-year revenue projections

---

## 1. Executive Summary

Tex2Film is a Persian-first AI film production platform. Our pipeline chains five AI APIs (Kling, ElevenLabs, OpenRouter LLMs, Suno/music, Vercel Blob) into a cohesive 7-stage production workflow. Each stage consumes real API spend; therefore our monetization model must:

1. **Cover API costs** at every price tier with positive gross margin
2. **Feel fair** to Iranian creative professionals who work in Toman
3. **Scale predictably** as heavy users generate more video
4. **Convert free users** at natural pipeline friction points

**Recommended model: Hybrid (subscription base + credit consumption)** — explained in Section 4.

---

## 2. API Cost Structure (May 2026)

All costs are in USD. Exchange rate assumption: 1 USD ≈ 65,000 TMN (use live rate at billing time).

### 2.1 Kling AI (Video & Image Generation)

Kling credits ≠ our platform credits. 1 Kling credit ≈ $0.014 USD (based on published API pricing).

| Operation | Kling Credits | USD Cost | Notes |
|---|---|---|---|
| Image generation (standard) | 1 cr | ~$0.014 | Per image, any resolution |
| Image generation (professional) | 2 cr | ~$0.028 | Higher quality, slower |
| Video 5s standard quality | 10 cr | ~$0.14 | Kling 1.6 standard |
| Video 5s professional quality | 35 cr | ~$0.49 | Kling 2.1 professional |
| Video 10s standard quality | 20 cr | ~$0.28 | |
| Video 10s professional quality | 70 cr | ~$0.98 | |
| Lip sync (per clip) | 10 cr | ~$0.14 | Based on source video duration |
| Image-to-video 5s standard | 10 cr | ~$0.14 | From reference image |
| Image-to-video 5s professional | 35 cr | ~$0.49 | |

**Bulk discount:** Kling offers volume pricing at higher monthly API spend. At >$500/mo spend: ~15% discount. At >$2,000/mo: ~25% discount.

### 2.2 ElevenLabs (Voice & Audio)

| Operation | Unit | USD Cost | Notes |
|---|---|---|---|
| TTS — Multilingual v2 | per 1K chars | $0.10 | Primary TTS model (Persian) |
| TTS — Flash v2.5 | per 1K chars | $0.03 | Faster, lower quality |
| TTS — Turbo v2.5 | per 1K chars | $0.05 | Mid-tier |
| Sound Effects (SFX) | per generation | ~$0.05 | POST /v1/sound-generation, 0.5–22s |
| Music generation (30s) | per generation | ~$0.08–0.12 | Via ElevenLabs music API |
| Voice cloning (IVC) | per submission | $0.10 | Instant voice clone |

**Average dialogue TTS per shot:** ~200 chars → $0.02/shot  
**Average narration TTS per project:** ~2,000 chars → $0.20/project

### 2.3 OpenRouter (LLM Orchestration)

All prices per million tokens (input / output).

| Model | Input $/MTok | Output $/MTok | Usage in pipeline |
|---|---|---|---|
| GPT-4o mini | $0.15 | $0.60 | Default for all stages (narrative, storyboard, elements) |
| GPT-4o | $2.50 | $10.00 | Premium cinematography briefs |
| DeepSeek V3 (0324) | $0.27 | $1.10 | Narrative + script writing alternative |
| Claude 3.5 Haiku | $0.80 | $4.00 | Director brief with structured output |
| Claude 3.5 Sonnet | $3.00 | $15.00 | Complex multi-stage orchestration |
| Gemini 2.0 Flash | $0.10 | $0.40 | High-throughput batch operations |

**Typical per-project LLM cost (GPT-4o mini, all 7 stages):** ~15K tokens → ~$0.012  
**With GPT-4o:** ~15K tokens → ~$0.19

### 2.4 Storage & Infrastructure

| Service | Cost | Notes |
|---|---|---|
| Vercel Blob storage | $0.023/GB/mo + $0.023/GB egress | Generated media assets |
| Vercel compute (Next.js) | ~$20–200/mo | Depending on usage tier |
| Neon PostgreSQL | $0–$69/mo | Free tier covers ~100 users |
| Replit hosting (dev) | Included in workspace | Not a prod cost |

**Average storage per project:** ~50–200 MB (images) + ~200–500 MB (videos)  
**Monthly storage at 100 active projects:** ~15–35 GB → ~$0.35–0.80/mo

---

## 3. Credit System Design

### 3.1 Platform Credit Value

We sell credits as an abstraction over raw API costs. This lets us:
- Buffer against API price changes
- Apply tiered margins per operation type
- Track consumption clearly per user

**1 platform credit = $0.01 USD at 3× gross margin target**  
This means we aim to pay ≤$0.0033 in API costs per credit consumed.

### 3.2 Operations-to-Credits Mapping

| Operation | Platform Credits | Actual API Cost | Gross Margin |
|---|---|---|---|
| LLM call (narrative/storyboard) | 2 cr | ~$0.012 | ~83% |
| Image generation (standard) | 8 cr | ~$0.014 | ~83% |
| Image generation (professional) | 15 cr | ~$0.028 | ~87% |
| Video 5s standard | 25 cr | ~$0.14 | ~44% |
| Video 5s professional | 55 cr | ~$0.49 | ~11% |
| Video 10s standard | 45 cr | ~$0.28 | ~38% |
| Video 10s professional | 100 cr | ~$0.98 | ~2% |
| TTS per shot (~200 chars) | 3 cr | ~$0.02 | ~33% |
| SFX generation | 5 cr | ~$0.05 | ~0% |
| Music generation 30s | 12 cr | ~$0.10 | ~17% |
| Lip sync (5s clip) | 40 cr | ~$0.14 | ~71% |

> **Key insight:** Professional video clips (55–100 cr) have very thin margins. This is intentional — professional video is a premium upgrade trigger and we make margin on the subscription fee + lower-cost operations. At volume, bulk Kling discounts improve video margins to ~25–40%.

### 3.3 Typical Project Credit Consumption

| Project Type | Operations | Credits Used | Revenue at $0.01/cr |
|---|---|---|---|
| Short narrative (10 shots, image-only) | 10 imgs std + 3 LLM + 2 TTS | ~115 cr | $1.15 |
| Standard film (15 shots, std video) | 15 imgs + 10 vid 5s std + 5 LLM + 5 TTS | ~490 cr | $4.90 |
| Pro film (20 shots, professional video) | 20 imgs + 15 vid 5s pro + 8 LLM + 10 TTS + 5 SFX | ~1,260 cr | $12.60 |
| Full production (30 shots + audio + lipsync) | 30 imgs pro + 25 vid pro + 5 lipsync + 15 TTS + 10 SFX + 3 music | ~2,900 cr | $29.00 |

---

## 4. Subscription Tier Definitions

### 4.1 Current Tiers (Existing)

| Tier | Price/mo (TMN) | Credits | Projects | Shots/proj | Notes |
|---|---|---|---|---|---|
| Free | 0 | 50 | 1 | 10 | With watermark |
| Pro | 149,000 | 500 | 10 | 50 | No watermark |
| Studio | 399,000 | 2,000 | Unlimited | Unlimited | Full features |

**Note:** These are the old prices. See revised structure below.

### 4.2 Revised Tier Recommendation

The current Pro tier (149,000 TMN = ~$2.30 USD) underprices relative to API costs. A 500-credit Pro user who makes one standard film (490 cr) exhausts nearly their whole monthly credit in a single project. Recommended revised structure:

| Tier | Price/mo (TMN) | Price/mo (USD est.) | Credits | Projects | Shots/proj | Watermark | Priority |
|---|---|---|---|---|---|---|---|
| **رایگان (Free)** | 0 | $0 | 50 | 1 | 8 | Yes | No |
| **سازنده (Creator)** | 600,000 | ~$3.53 | 500 | 5 | 30 | No | No |
| **استودیو (Studio)** | 1,200,000 | ~$7.06 | 1,500 | 20 | 100 | No | Email |
| **تیم (Team)** | 2,400,000 | ~$14.12 | 4,000 | Unlimited | Unlimited | No | Priority |
| **Enterprise** | Custom | Custom | Custom | Unlimited | Unlimited | No | Dedicated |

### 4.3 Margin Analysis per Tier

Assuming average user spends 80% of included credits:

| Tier | Monthly Revenue (USD) | API Cost at 80% usage | Gross Margin |
|---|---|---|---|
| Creator | $3.53 | ~$0.66 (400 cr × $0.0033 × 80%) | ~81% |
| Studio | $7.06 | ~$1.98 (1,200 cr × $0.0033 × 80%) | ~72% |
| Team | $14.12 | ~$5.28 (3,200 cr × $0.0033 × 80%) | ~63% |

> At scale with Kling bulk discounts (25%), API cost per credit drops to ~$0.0025, pushing all tier margins above 70%.

### 4.4 Feature Gate Matrix

| Feature | Free | Creator | Studio | Team |
|---|---|---|---|---|
| LLM narrative generation | ✅ GPT-4o mini | ✅ GPT-4o mini | ✅ GPT-4o | ✅ GPT-4o |
| Image generation | ❌ | ✅ Standard | ✅ Professional | ✅ Professional |
| Video generation | ❌ | ✅ Standard | ✅ Professional | ✅ Professional |
| TTS voice | ❌ | ✅ Flash | ✅ Multilingual v2 | ✅ Multilingual v2 |
| SFX generation | ❌ | ✅ | ✅ | ✅ |
| Music generation | ❌ | ❌ | ✅ | ✅ |
| Lip sync | ❌ | ❌ | ✅ | ✅ |
| Export watermark | ✅ (forced) | ❌ | ❌ | ❌ |
| Export resolution | 720p | 1080p | 4K | 4K |
| Project history | 7 days | 30 days | Forever | Forever |
| API access (future) | ❌ | ❌ | ❌ | ✅ |

---

## 5. Pricing Model Comparison

### 5.1 Model A: Pure Subscription

Users pay a flat monthly fee for unlimited (or large-pool) usage.

**Pros:** Predictable MRR, low friction, easy to understand  
**Cons:** Power users at Studio tier making 3+ professional films/mo cost us $30–90 in API spend while paying $7.50. Negative margin at high usage.

**Verdict:** ❌ Unsuitable alone for AI-heavy creative tools with variable API costs.

### 5.2 Model B: Pure Pay-Per-Use

Users pay per operation, no subscription.

**Pros:** No risk of margin squeeze, aligns cost with value  
**Cons:** Psychological friction on every click ("does this image cost me money?"). Kills experimentation, which is core to creative workflow. Churn is high when users pause projects.

**Verdict:** ❌ Bad UX for creative tools. Users fear clicking.

### 5.3 Model C: Hybrid Subscription + Credits ✅ RECOMMENDED

Users pay a monthly subscription that includes a generous credit bundle. Heavy users can buy top-up packs. Light users feel they're "getting their money's worth."

**Pros:**
- Predictable MRR from subscriptions
- Variable revenue upside from top-up packs
- Credit system creates psychological ownership ("I have 340 credits left")
- Natural upgrade triggers when credits run low
- Protects margin: if a user exhausts credits, they either stop or pay more

**Cons:** Credit system adds product complexity (need balance UI, top-up flow, deduction logic)

**Verdict:** ✅ Best fit. Used by Midjourney, Runway, Pika, ElevenLabs.

### 5.4 Model D: Project-Based Pricing

Users pay per completed project (e.g., 50,000 TMN per film delivered).

**Pros:** Aligns with how production houses think ("cost per project")  
**Cons:** Hard to define "project completion," doesn't reward exploration, poor MRR predictability.

**Verdict:** ❌ Better as an enterprise add-on, not a primary model.

---

## 6. Top-Up Credit Packs

Available as one-time Stripe purchases, accessible from the pricing page and the in-studio insufficient-credits modal:

| Pack Name | Credits | Price (TMN) | Price (USD) | CPK (cost per credit) |
|---|---|---|---|---|
| بسته کوچک (Small) | 100 cr | 59,000 | ~$0.91 | $0.0091 |
| بسته متوسط (Medium) | 300 cr | 390,000 | ~$2.29 | $0.0076 |
| بسته بزرگ (Large) | 800 cr | 349,000 | ~$5.37 | $0.0067 |
| بسته حرفه‌ای (Pro) | 2,000 cr | 790,000 | ~$12.15 | $0.0061 |

Top-up packs have higher per-credit cost than subscriptions — incentivizes subscription upgrades.

---

## 7. Freemium Conversion Triggers

Six key moments where free users hit a wall and should see an upgrade modal:

### 7.1 Video Generation Wall
Free users cannot generate video. When they click "تبدیل به ویدیو" on any shot card, show:
> *"تولید ویدیو نیاز به پلن سازنده دارد"* — with Creator plan CTA

### 7.2 Export Quality Gate
Free exports are 720p with watermark. Before download, show:
> *"خروجی بدون واترمارک در پلن سازنده"* — with preview thumbnail comparison

### 7.3 Project Limit Gate
Free = 1 project. When a user tries to create project #2:
> *"برای ساخت پروژه دوم، پلن سازنده را فعال کنید"*

### 7.4 Credit Exhaustion Modal
When credits hit 0 during an operation:
> *"اعتبار کافی ندارید"* — show current balance, operation cost, top-up packs, upgrade option

### 7.5 Shot Limit Gate
Free = 8 shots per project. When adding shot #9:
> *"شات‌های بیشتر در پلن سازنده"*

### 7.6 Professional Audio Gate
SFX, music generation, lip sync gated to Studio+. When clicking these features:
> *"صداگذاری حرفه‌ای در پلن استودیو"*

**Implementation priority:** 7.4 (credit exhaustion) > 7.1 (video wall) > 7.3 (project limit) > 7.2 (export gate) > 7.5 > 7.6

---

## 8. B2B Segments & Pricing

### 8.1 Target Segments

| Segment | Size | Typical Need | Pricing Approach |
|---|---|---|---|
| **Production houses** (شرکت تولید محتوا) | 5–50 person teams | 10–50 projects/mo, multiple users | Team plan × seats or Enterprise |
| **Advertising agencies** (آژانس تبلیغاتی) | 3–20 persons | Fast turnaround, 30s–2min spots | Studio plan per art director |
| **Universities & film schools** (دانشگاه) | 20–200 students/semester | Education license, many concurrent users | Flat edu license: 5,000,000 TMN/semester |
| **News organizations** (خبرگزاری) | 5–30 editors | Fast explainer videos, daily use | Team plan with SLA |
| **Content networks** (شبکه‌های محتوا) | 10–100 creators | Volume production, batch processing | Volume discount on API access |
| **Ad-tech resellers** | Platform builders | White-label API | Revenue share or per-API-call |

### 8.2 Enterprise Package Components

Enterprise pricing is negotiated. Key components:

- Dedicated Kling quota (no rate-limit competition)
- Private LLM deployment option (self-hosted models)
- Custom onboarding & training sessions
- SLA: 99.5% uptime, <2hr response support
- White-label option (custom domain, branding removal)
- Usage analytics dashboard
- Invoicing in Toman with official receipts (فاکتور رسمی)

**Suggested Enterprise starting price:** 5,000,000–15,000,000 TMN/mo depending on seats and volume.

---

## 9. Iranian Payment Infrastructure

### 9.1 The Dual-Gateway Problem

Iranian users cannot use international payment cards (Visa/Mastercard) due to SWIFT sanctions. Stripe is not accessible from Iran without VPN. We must offer both:

1. **Stripe** — for international users (diaspora, non-Iranian studios)
2. **Iranian gateway** — for domestic Iranian users paying in Toman

### 9.2 Iranian Payment Gateway Comparison

| Gateway | Fee | Settlement | API Quality | Notes |
|---|---|---|---|---|
| **Zarinpal** | 1% + 2,000 TMN/tx | T+1 banking day | ⭐⭐⭐⭐⭐ | Most popular, best docs, Sandbox available |
| **IDPay** | 1% | T+2 | ⭐⭐⭐⭐ | Supports subscriptions natively |
| **NextPay** | 1% | T+1 | ⭐⭐⭐⭐ | Good REST API, JSON responses |
| **Mellat (BehPardakht)** | 0.5% | T+0 | ⭐⭐ | Bank-level trust, complex SOAP API |
| **Parsian** | 0.7% | T+1 | ⭐⭐⭐ | Common in B2B |

**Recommendation: Zarinpal as primary** (best developer experience, widest Sheba support). IDPay as secondary for subscription billing.

### 9.3 Recommended Architecture

```
User clicks "Upgrade"
    │
    ├─ Is user in Iran / prefers Toman? ─→ Zarinpal checkout (TMN)
    │                                          │
    │                                          └─→ Zarinpal callback → update user tier/credits in DB
    │
    └─ International / prefers USD? ──→ Stripe Checkout (USD)
                                           │
                                           └─→ Stripe webhook → update user tier/credits in DB
```

Both gateways write to the same `users` table updating `tier` and `credits`. Create a `payments` table to log all transactions from both gateways.

### 9.4 Subscription Handling for Iranian Market

Zarinpal/IDPay do not have native recurring billing as robust as Stripe. Recommended approach:
- Store the subscription expiry date in `users.subscriptionExpiresAt`
- Send renewal reminder email 5 days before expiry
- Allow manual renewal (user clicks "تمدید اشتراک")
- Optionally: auto-renewal consent at signup with Zarinpal's auto-pay feature (شتاب اتوپرداخت)

---

## 10. Revenue Projections

### 10.1 Assumptions

- Average revenue per paying user (ARPU): 350,000 TMN/mo (~$5.40 USD)
- Free-to-paid conversion rate: 8% (industry average for creative SaaS)
- Monthly churn: 6% for individual plans, 2% for Team/Enterprise
- Top-up revenue: 15% of total revenue from credit packs
- Exchange rate: 65,000 TMN/USD (volatile — hedge with USD pricing where possible)

### 10.2 Year 1 Projections (1,000 registered users)

| Month | Reg. Users | Paying Users (8%) | MRR (TMN) | MRR (USD) |
|---|---|---|---|---|
| M1 | 200 | 16 | 5,600,000 | ~$86 |
| M3 | 500 | 40 | 14,000,000 | ~$215 |
| M6 | 800 | 64 | 22,400,000 | ~$344 |
| M9 | 1,000 | 80 | 28,000,000 | ~$430 |
| M12 | 1,200 | 96 | 33,600,000 | ~$517 |

**Year 1 Total ARR:** ~$4,200 USD (break-even on Vercel + Neon infra costs)

### 10.3 Year 2 Projections (10,000 registered users)

| Quarter | Reg. Users | Paying Users | MRR (TMN) | MRR (USD) |
|---|---|---|---|---|
| Q1 Y2 | 3,000 | 300 | 105,000,000 | ~$1,615 |
| Q2 Y2 | 5,000 | 500 | 175,000,000 | ~$2,692 |
| Q3 Y2 | 7,500 | 750 | 262,500,000 | ~$4,038 |
| Q4 Y2 | 10,000 | 1,000 | 350,000,000 | ~$5,385 |

**Year 2 Total ARR:** ~$38,000 USD — sustains 1 FTE salary at Iranian market rates + infrastructure.

**Add 2 Enterprise clients (Q3 Y2):** +$3,000/mo → ARR increases to ~$72,000

### 10.4 Key Unit Economics Targets

| Metric | Target |
|---|---|
| Blended gross margin | ≥ 55% |
| CAC (Customer Acquisition Cost) | < 300,000 TMN |
| LTV (Lifetime Value) | > 1,800,000 TMN (6-month avg) |
| LTV:CAC ratio | > 6:1 |
| Payback period | < 2 months |
| Net Revenue Retention | > 110% (expansion via top-ups) |

---

## 11. Implementation Roadmap

### Phase 1 — Credit Infrastructure (Plan E, current sprint)
- [ ] Stripe integration (international payments)
- [ ] Credit deduction on every AI operation (server-side, atomic)
- [ ] Credit balance UI in studio header
- [ ] Upgrade modals at all 6 conversion triggers
- [ ] Top-up credit packs via Stripe one-time payment

### Phase 2 — Iranian Gateway (Q3 2026)
- [ ] Zarinpal integration for Toman subscriptions
- [ ] IDPay auto-renewal for monthly subscribers
- [ ] Dual-gateway routing based on user locale/preference
- [ ] Payments audit table for both gateways

### Phase 3 — B2B & Enterprise (Q4 2026)
- [ ] Team workspace (shared credit pool, multiple seats)
- [ ] Usage analytics dashboard for admins
- [ ] Enterprise contract/SLA flow
- [ ] Education license tier
- [ ] White-label option

### Phase 4 — Optimization (Q1 2027)
- [ ] Kling bulk pricing negotiation at $2,000+/mo spend
- [ ] LLM model routing (use cheaper models for simple tasks)
- [ ] Storage optimization (compress and expire old generations)
- [ ] Annual plan discount (20% off for annual commitment)

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TMN/USD exchange rate collapse | High | Medium | Price subscriptions in USD equivalent, convert to TMN at billing |
| Kling API price increase | Medium | High | Multi-provider fallback (Runway, Pika); credit buffer in pricing |
| ElevenLabs Persian quality degrades | Low | Medium | Cache TTS outputs; allow user voice upload |
| Heavy user burns credits at loss | Medium | Medium | Per-account usage alerts at 80% and 100% burn; overage auto-pause |
| Sanctions/payment processing changes | High | High | Maintain both international (Stripe) and domestic (Zarinpal) simultaneously |
| Competitor undercuts pricing | Medium | Medium | Focus on Persian-language differentiation; community moat |
| Iranian app stores refuse payment processing | Low | Low | Direct web payments; no app store dependency |

---

## Appendix A: Pricing Page Current vs. Recommended

| Attribute | Current Free | Rec. Free | Current Pro | Rec. Creator | Current Studio | Rec. Studio |
|---|---|---|---|---|---|---|
| Price/mo | 0 | 0 | 149,000 | 249,000 | 399,000 | 490,000 |
| Credits | 50 | 50 | 500 | 400 | 2,000 | 1,200 |
| Projects | 1 | 1 | 10 | 5 | ∞ | 20 |
| Max shots | 10 | 8 | 50 | 30 | ∞ | 100 |
| Video | No | No | Yes (std) | Yes (std) | Yes (all) | Yes (all) |

> Note: Credit count in Creator (400) is lower than current Pro (500) but projects are reduced from 10 to 5, ensuring average revenue-per-project is higher and margins are maintained. Studio credit reduction (2000→1200) is offset by professional video quality access and feature unlocks.

## Appendix B: References

- Kling API pricing: https://klingai.com/api/pricing (accessed May 2026)
- ElevenLabs pricing: https://elevenlabs.io/pricing (accessed May 2026)
- OpenRouter pricing: https://openrouter.ai/models (accessed May 2026)
- Zarinpal developer docs: https://docs.zarinpal.com
- IDPay developer docs: https://idpay.ir/web-service/v1.1
- Stripe pricing: https://stripe.com/pricing
