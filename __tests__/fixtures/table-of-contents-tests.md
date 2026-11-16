---
title: 'Table Of Contents Tests'
category: 5fdf9fc9c2a7ef443e937315
hidden: true
---

# Getting Started

Welcome to the API! This guide will walk you through everything you need to know to get up and running quickly. We'll cover authentication, making your first request, and handling responses.

Before you begin, make sure you have an API key. You can generate one from your project dashboard under **Settings > API Keys**.

## Authentication & More & More

All API requests require a bearer token in the `Authorization` header. Tokens are scoped to a specific project and can be revoked at any time.

```bash
curl -X GET https://api.example.com/v1/me \
  -H "Authorization: Bearer your-api-key"
```

If your token is invalid or expired, the API will return a `401 Unauthorized` response.

## Rate Limits

All endpoints are rate-limited to prevent abuse. The default limit is **250 requests per minute** per API key. If you exceed this limit, the API will return a `429 Too Many Requests` response with a `Retry-After` header.

| Plan       | Rate Limit        |
| ---------- | ----------------- |
| Free       | 60 requests/min   |
| Starter    | 250 requests/min  |
| Business   | 1000 requests/min |
| Enterprise | Custom            |

# Core Concepts

Understanding the core concepts will help you make the most of the API. This section covers the main resources and how they relate to each other.

## Projects

A project is the top-level resource. Everything else — API keys, docs, changelogs, and metrics — belongs to a project. Each project has a unique subdomain and can be configured independently.

Projects support versioning, so you can maintain multiple versions of your documentation side by side. Each version has its own set of pages and API definitions.

## Categories

Categories are used to organize your documentation pages into logical groups. Each category belongs to a specific version of a project and can contain multiple pages.

Categories are displayed in the sidebar navigation and can be reordered via drag-and-drop in the dashboard or programmatically via the API.

## Pages

Pages are the individual documentation articles within a category. Each page supports full Markdown with extensions like callouts, code tabs, and embedded API explorers.

Pages can be nested up to 3 levels deep, creating a hierarchy of parent and child pages. This is useful for organizing complex documentation into digestible sections.

# API Reference

The REST API follows standard conventions. All endpoints accept and return JSON. Timestamps are in ISO 8601 format, and all IDs are strings.

## Endpoints

### List Projects

```
GET /v1/projects
```

Returns a paginated list of all projects accessible with the current API key.

### Get a Project

```
GET /v1/projects/:id
```

Returns the full details of a single project, including its versions and settings.

### Create a Page

```
POST /v1/projects/:id/pages
```

Creates a new documentation page. The request body must include a `title` and `category` field. Optionally, you can include `body` (Markdown content) and `hidden` (boolean).

## Error Handling

The API uses standard HTTP status codes to indicate success or failure. All error responses include a JSON body with `error` and `message` fields.

```json
{
  "error": "VALIDATION_ERROR",
  "message": "The 'title' field is required.",
  "suggestion": "Please provide a non-empty string for the page title."
}
```

| Status Code | Meaning               |
| ----------- | --------------------- |
| 200         | Success               |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 429         | Rate Limited          |
| 500         | Internal Server Error |

# Webhooks

Webhooks let you receive real-time notifications when events happen in your project. Instead of polling the API, you can register a URL and we'll send a POST request whenever something changes.

## Setting Up Webhooks

Navigate to **Settings > Webhooks** in your project dashboard and click **Add Webhook**. Enter the URL where you'd like to receive events, and select which event types to subscribe to.

Your endpoint must respond with a `2xx` status code within 10 seconds, or the delivery will be marked as failed. Failed deliveries are retried up to 5 times with exponential backoff.

## Event Types

- `page.created` — A new page was published
  - Nested list item
    - Even more nested
  - Nested list item 2
- `page.updated` — An existing page was modified
- `page.deleted` — A page was removed
- `version.created` — A new version was created
- `project.settings_updated` — Project settings were changed

# SDKs and Libraries

We maintain official SDKs for the most popular languages. Each SDK wraps the REST API and provides typed methods for all endpoints.

## JavaScript / TypeScript

```bash
npm install @example/sdk
```

```javascript
import Example from '@example/sdk';

const client = new Example({ apiKey: 'your-api-key' });
const projects = await client.projects.list();
```

## Python

```bash
pip install example-sdk
```

```python
from example_sdk import Client

client = Client(api_key="your-api-key")
projects = client.projects.list()
```

## Inline Images

After the relevant date, control elements referenced as parameters in SQL that are wrapped by a single quote or backtick will no longer be replaced with the value of the control. Instead, values inside of a single quote or backtick character will be treated as a string or alias in the SQL.

<Image src="https://files.readme.io/ecf8cb0a91ddea75a9079afbd91119f57246b8a673a234e4db338910f5695f83-search-sql-lineage.png" alt="Search bar in the lineage view with the search term SQL, showing 4 results, 2 tables called Custom SQL and 2 custom SQL elements directly." align="center" />

For each document in the referenced list:

1. Open the document for editing.

2. Click **Lineage** (![](https://sigma-docs-screenshots.s3.us-west-2.amazonaws.com/Icons/lineage.svg)), then search for **SQL**.

   <Image src="https://files.readme.io/ecf8cb0a91ddea75a9079afbd91119f57246b8a673a234e4db338910f5695f83-search-sql-lineage.png" alt="Search bar in the lineage view with the search term SQL, showing 4 results, 2 tables called Custom SQL and 2 custom SQL elements directly." align="center" />

3. For each **Custom SQL** ![](https://sigma-docs-screenshots.s3.us-west-2.amazonaws.com/Icons/sql-editor.svg) element in your document, select the custom SQL element and review the SQL query.

   <Image src="https://files.readme.io/07da3dd46aafd8e748d48ba0d5b470645dbe3ca73af41aaeab29a0ca7b0ac244-custom-sql-lineage.png" alt="After selecting the custom SQL element in the lineage view, review the summary of the connection and the SQL query itself, with options to copy query, focus the element in lineage, or edit the SQL." align="center" />

4. If the SQL query contains invalid syntax, click **Edit SQL** to open the element for editing in the canvas.

5. If the SQL statement is more than a few lines, copy the SQL from the custom SQL element and paste it into a plain text editor, then search for the control ID mentioned in the email.
