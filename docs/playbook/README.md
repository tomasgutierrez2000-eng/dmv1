# Risk Stripe Onboarding Playbook

This playbook enables risk stripes beyond Credit Risk -- such as Market Risk, Operational Risk, Enterprise Risk Management, and Liquidity Risk -- to onboard their data and metrics to the shared banking data model platform. It covers the three-layer architecture, the tools available, and a step-by-step process for defining tables, writing metric specs, and going live.

## Quick Start (5 Steps)

1. **Learn the architecture** -- Read [01 - Data Model Overview](01-data-model-overview.md) to understand the L1/L2/L3 layer model
2. **Explore the platform** -- Read [02 - Platform Capabilities](02-platform-capabilities.md) then browse the visualizer at `/visualizer` and the metric library at `/metrics/library`
3. **Fill out the intake worksheet** -- Follow [03 - Onboarding Guide](03-onboarding-guide.md) to identify which tables you reuse, what new tables you need, and what metrics to define
4. **Write your metric YAML specs** -- Use the [04 - Worked Example (Market Risk)](04-worked-example-market-risk.md) as a reference and the templates in [05 - Reference](05-reference.md)
5. **Run the pipeline** -- Execute `npm run calc:sync` then `npm run validate` to generate your catalogue entries and verify everything

## Playbook Contents

| Section | What It Covers | Who Should Read |
|---------|---------------|-----------------|
| [01 - Data Model Overview](01-data-model-overview.md) | L1/L2/L3 architecture, table inventory, naming conventions | Everyone |
| [02 - Platform Capabilities](02-platform-capabilities.md) | Visualizer, metric library, calculation engine, AI agent | Everyone |
| [03 - Onboarding Guide](03-onboarding-guide.md) | Step-by-step onboarding with intake worksheet | Business Analysts + Tech Leads |
| [04 - Worked Example: Market Risk](04-worked-example-market-risk.md) | Complete example: new tables, YAML specs, pipeline output | Tech Leads |
| [05 - Reference](05-reference.md) | YAML template, naming rules, CLI commands, glossary | Tech Leads |

## Getting Help

- **AI Agent** -- Ask natural-language questions about the schema at `/agent`
- **Data Model Visualizer** -- Browse all 216+ tables interactively at `/visualizer`
- **Metric Library** -- Explore existing metrics and their definitions at `/metrics/library`
- **DB Status Dashboard** -- Check database sync status at `/db-status`
