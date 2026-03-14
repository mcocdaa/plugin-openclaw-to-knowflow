# KnowFlow Plugin Skill

## Overview

This skill provides integration with KnowFlow, a knowledge management system. The plugin enables OpenClaw agents to create, search, list, and retrieve knowledge items directly from KnowFlow.

## Configuration

### Plugin Configuration

The plugin requires the following configuration:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `baseUrl` | string | `http://localhost:3000` | KnowFlow API base URL |

### Setting Configuration

In your OpenClaw configuration, set the KnowFlow plugin config:

```json
{
  "plugins": {
    "knowflow": {
      "baseUrl": "http://localhost:3000"
    }
  }
}
```

## Available Tools

### 1. knowflow_record

Create a KnowFlow knowledge item with OpenClaw attributes in a single call.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Item name |
| `projectId` | string | Yes | - | OpenClaw project ID |
| `type` | string | No | `document` | Archive type (requirement/code/test/document/flow_record) |
| `summary` | string | No | - | Item summary |
| `content` | string | No | - | Item content |
| `agent` | string | No | - | Agent source |
| `foldLevel` | number | No | 3 | Fold level (1-3) |

**Example:**
```json
{
  "name": "API Design Document",
  "projectId": "my-project-001",
  "type": "document",
  "summary": "REST API design guidelines",
  "agent": "coding-agent",
  "foldLevel": 2
}
```

---

### 2. knowflow_search

Search KnowFlow knowledge items.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | No | - | Search query text |
| `key` | string | No | - | Filter by key field |
| `keyValue` | string | No | - | Filter by key value |
| `sort` | string | No | `recent` | Sort order |
| `page` | number | No | 1 | Page number |
| `pageSize` | number | No | 20 | Items per page |

**Example:**
```json
{
  "query": "API design",
  "sort": "recent",
  "pageSize": 10
}
```

---

### 3. knowflow_list

List recent KnowFlow knowledge items.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 20 | Maximum items to return |

**Example:**
```json
{
  "limit": 50
}
```

---

### 4. knowflow_get

Get a single KnowFlow item by ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `id` | string | Yes | - | Item ID |

**Example:**
```json
{
  "id": "507f1f77bcf86cd799439011"
}
```

## Usage Examples

### Recording a New Knowledge Item

```
Use knowflow_record to create a new document:
- name: "User Authentication Flow"
- projectId: "project-alpha"
- type: "document"
- summary: "OAuth2 login flow diagram"
- agent: "coding-agent"
```

### Searching Knowledge Base

```
Search for "API documentation" in KnowFlow:
- query: "API documentation"
- sort: "recent"
- pageSize: 10
```

### Listing Recent Items

```
Get the 20 most recent items:
- limit: 20
```

### Retrieving Specific Item

```
Get details of item 507f1f77bcf86cd799439011
- id: "507f1f77bcf86cd799439011"
```

## API Reference

The plugin uses the following KnowFlow API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/item` | Create knowledge item |
| GET | `/api/v1/item/search` | Search items |
| GET | `/api/v1/item/{id}` | Get item by ID |
| PUT | `/api/v1/plugins/knowflow_openclaw/items/{id}/openclaw` | Set OpenClaw attributes |

## Notes

- Ensure KnowFlow backend is running and accessible
- The `projectId` parameter is required for all recording operations
- OpenClaw attributes (foldLevel, archiveType, etc.) are set automatically during record creation
- The plugin handles HTTP error responses and throws descriptive errors