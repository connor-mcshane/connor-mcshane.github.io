---
title: "UK Gilt Screener in Streamlit"
author: "Connor McShane"
pubDatetime: 2024-04-29T12:00:00Z
featured: false
draft: false
tags:
  - Streamlit
  - Finance
  - Python
heroImage: "../../assets/images/gilt-screener/image.png"
description: "A small Streamlit app to surface CGT-friendly UK gilts: DMO reference data, published prices, post-tax yields, and a yield curve you can filter."
---

I hate paying more tax than I need to and the tax you pay on earned interest can be quite hefty.**UK gilts** though are tax very on the capital gains component, meaning if we look for low coupon bonds we can get tax efficient bonds that beat bank interest any day of the week.

I got tired of eyeballing lists, so I built a **Streamlit** screener: it joins the DMO *gilts in issue* reference with a daily price feed, works out time to maturity, running yield, a **post-tax yield** at a few marginal tax rates, and a **Plotly** yield curve you can slice with simple filters. **Data** is baked into a **parquet** file in the repo and refreshed by a cron job. 


*Code is on [GitHub](https://github.com/connor-mcshane/gilt-screener). Live demo is on [Streamlit Cloud](https://gilt-screener.streamlit.app/).*


