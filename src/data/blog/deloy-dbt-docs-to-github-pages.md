
---
title: "How to Deploy DBT Docs to Github Pages using Github Actions"
author: "Connor McShane"
pubDatetime: 2023-01-05T12:00:00Z
featured: true
draft: false
tags:
  - DBT
  - Github Actions
heroImage: "../../assets/images/dbt-gha/image.png"
description: "Playing around with Return Stacking portfolios in Streamlit"
---


Github pages are great for deploying static HTML files as documentation for your repo but unfortunately. This article just shows how you deploy dbt docs on an existing dbt-bigquery project in Github.

### **Step 1. Configure GitHub pages for your repo**

Ensure that you are deploying from the gh-pages branch and the target folder is on the root branch.

![Github pages setup](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*-w3kSc2omCLDnYwsfEm55w.png)

### **Step 2. Create project secrets and add them to your project**

In this case we have added the bigquery project, dataset, keyfile and github token as secrets but this may change depending on your setup.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*KqxXtw4zwfyf1xE-UBmnJQ.png)

### **Step 3. Add this python script to the root of your DBT project**

This script will adds the manifest and catalogue to the index.html page which is served by DBT docs.

### Step 4. Add a build step at the end of your workflow action

This snippet just calls the python script and then uses a github action to commit the single.html file on the github pages branch. You could also use Github CLI to commit the file to the branch instead.

The full github actions file looks like this:

### And that's it

When you next merge your changes to the main branch Github actions will deploy your docs to your pages link :)

![https://connor-mcshane.github.io/dbt-docs-github-pages/](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*tDbMWk2BVNRJLDde-epOZg.png)

Notes
-----

*   4Sushi provided the script to convert the DBT docs into a single page HTML, the link and discussion are available [here](https://github.com/dbt-labs/dbt-docs/issues/53#issuecomment-1011053807).
*   This hasn’t been tested on large dbt projects with large dbt graphs so there might be some performance issues.