---
title: "Kimball is Not Dead"
author: "Connor McShane"
pubDatetime: 2026-03-28T12:00:00Z
featured: true
draft: false
tags:
  - Kimball
  - Data Warehousing
  - Cloud
heroImage: "../../assets/images/kimball-hero.png"
description: "Kimball is not dead and is very much alive"
---

<!-- Notes
For the past couple of years, I have been seeing a large number of data analysts/analytics engineers with little to no knowledge about Kimball.

As a Data Platform Engineer, I would normally give the analysts autonomy to create their own models with some structured layers following DBT best practices

However over time this degrades, and then we eventually get into  hundreds or thousands of models, with no clear over arching strategy to the data warehouse

People were thinking that Kimball was dead, OBT would take over and then it would all be sorted. This was just a lazy way to put off doing the required work up front to manage the data warehouse and DBT models. Eventually the Data Warehouse degrades, large amounts of models, alot made by people who have left.

We forget less is more, and instead of upgrading existing models, new ones are built, costs continue to grow and we realise that its difficult for us to plug out marts and reporting table into a MCP server to ask questions from Claude or Gemini CLI

use this as inspo 

https://blog.dataexpert.io/p/the-data-warehouse-setup-no-one-taught
 -->

For the past couple of years I have been seeing a growing number of data analysts and analytics engineers entering the industry with little to no knowledge of Kimball or dimensional modelling. At the same time, data warehouse costs at my current job have doubled in the past year and I have spent most of my time playing whack-a-mole on warehouse optimisations instead of building anything useful.

These two things are not unrelated.

## How we got here

As a Data Platform Engineer, I would normally give analysts autonomy to create their own dbt models. We'd set up some structured layers following the standard dbt best practices (staging, intermediate, marts) and let them get on with it. At first this works great. Dashboards ship fast, people are happy, velocity is high.

But over time it degrades. Fast forward a year and you're staring at hundreds or even thousands of dbt models with no clear overarching strategy. Nobody knows which models are canonical and which ones were thrown together for a one-off request that somehow became permanent. A lot of them were built by people who have since left, but they decided to add their initials to model names?

The warehouse becomes a graveyard of abandoned SQL.

## The OBT myth

Somewhere along the way the narrative became "Kimball is dead". One Big Table (OBT) would take over and sort everything out. Storage is cheap, compute is fast, so why bother modelling your data properly? Just throw everything into one massive wide table and let the query engine deal with it.

I think for a lot of teams, embracing OBT was just a convenient way to avoid doing the hard work up front. It's easier to denormalise everything into a big flat table than it is to actually think about your data model, define your grain, and maintain proper dimensions and facts.

But what actually happens is the warehouse rots. Instead of upgrading existing models, new ones get stacked on top. Costs spiral. And we forget that less is more.

## Where Kimball fits in dbt

If you follow the [dbt best practices for project structure](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview), you'll have three main layers:

- **Staging (`stg_`)** - One-to-one with your source tables. Light cleaning, renaming columns, casting types. No business logic. These should be materialised as views.
- **Intermediate (`int_`)** - This is where you handle joins between staging models, derived fields, and any complex transformations. These are typically ephemeral or views. Organised by business domain, not by source system.
- **Marts** - The final business-facing models that analysts and dashboards actually query. Materialised as tables.

Kimball lives in the marts layer. This is where you build your Dimension (`dim_`) and Fact (`fct_`) tables. A `dim_customers` table with one row per customer. A `fct_orders` table with one row per order event. Clean, well-defined grain, documented, tested.

The problem I keep seeing is that teams skip the discipline in the marts layer entirely. Instead of a small set of well-maintained dimensional models, you end up with dozens of one-off mart tables like `mart_revenue_v2_final_johns_version`. Nobody trusts any of them, so they build another one.

```
sources/
├── src_production_db
├── src_marketing_api
└── src_payments

staging/
├── stg_production__users
├── stg_production__orders
├── stg_marketing__campaigns
└── stg_payments__transactions

intermediate/
├── int_orders_enriched
└── int_users_with_campaigns

marts/
├── dim_customers          <-- Kimball lives here
├── dim_products
├── fct_orders
├── fct_page_views
└── agg_daily_revenue
```

The key insight is that the marts layer should be small, stable, and owned. These are not throwaway models. They are the core data products of your organization. If an analyst needs something new, the first question should be "can we extend an existing dim or fct table?" not "let me create a new model".

## Why this matters now more than ever

We are in an era where you can plug your data warehouse into an MCP server and ask Claude or the Gemini CLI questions in natural language. "What was our revenue by region last quarter?" is a perfectly reasonable thing to ask an LLM that has access to your warehouse.

But if your warehouse is a tangled mess of overlapping, poorly named, undocumented models, the LLM is going to struggle. It won't know which of your five revenue tables to use. It will pick the wrong one or hallucinate an answer.

A clean Kimball warehouse with well-defined dims and facts is exactly the kind of semantic layer that AI tools need. One `fct_orders` table with a clear grain and good column names is infinitely more useful to an LLM than a sprawling mess of ad-hoc models.


## What I'm doing about it

At my current job I've started pushing back on the "just create a new model" culture.

1. **Audit what exists - Heatmap Dashboard.** Work out which models are actually being queried and which are dead weight. This can be done quite easily by building a dashboard looking at table usage across the Data Warehouse.
2. **Define your core dims, facts and automate ERD diagrams.** Sit down with the business and agree on the core entities. Customers, orders, products, whatever makes sense for your domain. Build proper dimensional models for these in the marts layer. Set up an automated process to generate an ERD which can be shared across teams to understand your models better (I recommend [dbterd](https://github.com/datnguye/dbterd)).
3. **Gate new models with code review and sprinkle in some GPT agents for review.** At the moment, I am setting up quality gates that also check if the models fit into the overarching data warehouse strategy. This, combined with SQL fluff and CI/CD tests, makes for a more bulletproof deployment process.
4. **Document and test.** Use dbt's built-in docs and tests. If a model doesn't have a description and at least basic tests, it shouldn't be in production.

It's not glamorous work. But my warehouse costs doubled in a year because nobody was doing it, and now I'm spending my days optimising queries that shouldn't exist in the first place.

Kimball isn't dead. We just got lazy.
