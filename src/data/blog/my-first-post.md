---
title: "Modern Data Stacks with BigQuery and DBT"
author: "Connor McShane"
pubDatetime: 2026-03-28T12:00:00Z
featured: true
draft: false
tags:
  - BigQuery
  - DBT
  - Data Engineering
heroImage: "../../assets/images/AstroPaper-v5.png"
description: "How to migrate and scale your data warehouse using BigQuery and DBT."
---

Migrating to BigQuery can drastically improve performance and reduce operational complexity for data teams. In this post, I'll walk through a recent migration from Databricks to BigQuery and how DBT ties everything together.

## The Architecture

Our architecture revolves around GCP:
- **Ingestion:** Airbyte running on GKE
- **Storage:** Google Cloud Storage (Data Lake)
- **Warehouse:** BigQuery
- **Transformation:** DBT managed by Airflow on Cloud Composer

## Why BigQuery?

With BigQuery's serverless model and flexi-slot allocations, we were able to reduce costs by 30–40%, leading to an annual saving of $300K. The ability to seamlessly scale and separate compute from storage means teams can focus entirely on data modelling and business value.

## Enter DBT

By implementing the full DBT stack alongside Airflow, we established robust CI/CD pipelines. Features like Elementary for custom data anomaly detection and freshness alerting give us immense confidence in our data quality.