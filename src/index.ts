/**
 * KnowFlow OpenClaw Plugin
 * Provides agent tools for KnowFlow knowledge management integration
 */

interface PluginConfig {
  baseUrl: string;
}

interface ToolExecuteParams {
  config: PluginConfig;
  params: Record<string, unknown>;
}

interface ToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// Default config
const defaultConfig: PluginConfig = {
  baseUrl: "http://localhost:3000"
};

/**
 * Make HTTP request to KnowFlow API
 */
async function apiRequest(
  baseUrl: string,
  method: string,
  path: string,
  body?: object
): Promise<unknown> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const options: RequestInit = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Tool: knowflow_record
 * Creates a KnowFlow item with OpenClaw attributes in one call
 * 
 * Required params: name, projectId
 * Optional params: type (default: document), summary, content, agent, foldLevel (default: 3)
 */
async function knowflow_record(params: ToolExecuteParams): Promise<ToolResult> {
  const baseUrl = params.config.baseUrl || defaultConfig.baseUrl;
  const { name, projectId, type, summary, content, agent, foldLevel } = params.params;

  // Validate required params
  if (!name || typeof name !== "string") {
    throw new Error("name is required and must be a string");
  }
  if (!projectId || typeof projectId !== "string") {
    throw new Error("projectId is required and must be a string");
  }

  const archiveType = (type as string) || "document";
  const foldLevelNum = typeof foldLevel === "number" ? foldLevel : 3;

  // Step 1: Create item via POST /api/v1/item
  const createBody = {
    name: name,
    keyValues: {
      name: name,
      file_path: "",
      file_type: archiveType
    }
  };

  const createResult = await apiRequest(baseUrl, "POST", "/api/v1/item", createBody) as {
    item: { id: string; name: string };
    attributes?: Record<string, unknown>;
    key_info?: Record<string, unknown>;
  };

  const itemId = createResult.item.id;

  // Step 2: Set OpenClaw attributes via PUT /api/v1/plugins/knowflow_openclaw/items/{id}/openclaw
  const openclawBody = {
    openclaw_project_id: projectId,
    openclaw_archive_type: archiveType,
    openclaw_fold_level: foldLevelNum,
    openclaw_agent_source: (agent as string) || "",
    openclaw_summary: (summary as string) || "",
    openclaw_flow_id: ""
  };

  const updateResult = await apiRequest(
    baseUrl,
    "PUT",
    `/api/v1/plugins/knowflow_openclaw/items/${itemId}/openclaw`,
    openclawBody
  );

  const result = {
    success: true,
    itemId,
    itemName: createResult.item.name,
    openclawAttributes: updateResult
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  };
}

/**
 * Tool: knowflow_search
 * Searches KnowFlow items
 * 
 * Params: query, key, keyValue, sort (default: recent), page (default: 1), pageSize (default: 20)
 */
async function knowflow_search(params: ToolExecuteParams): Promise<ToolResult> {
  const baseUrl = params.config.baseUrl || defaultConfig.baseUrl;
  const { query, key, keyValue, sort, page, pageSize } = params.params;

  const queryParams = new URLSearchParams();
  
  if (query) queryParams.set("q", query as string);
  if (key) queryParams.set("key", key as string);
  if (keyValue) queryParams.set("key_value", keyValue as string);
  queryParams.set("sort", (sort as string) || "recent");
  queryParams.set("page", String(page || 1));
  queryParams.set("page_size", String(pageSize || 20));

  const result = await apiRequest(
    baseUrl,
    "GET",
    `/api/v1/item/search?${queryParams.toString()}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  };
}

/**
 * Tool: knowflow_list
 * Lists recent KnowFlow items
 * 
 * Params: limit (default: 20)
 */
async function knowflow_list(params: ToolExecuteParams): Promise<ToolResult> {
  const baseUrl = params.config.baseUrl || defaultConfig.baseUrl;
  const limit = params.params.limit || 20;

  const result = await apiRequest(
    baseUrl,
    "GET",
    `/api/v1/item/search?sort=recent&page_size=${limit}`
  );

  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  };
}

/**
 * Tool: knowflow_get
 * Retrieves a single KnowFlow item by id
 * 
 * Required params: id
 */
async function knowflow_get(params: ToolExecuteParams): Promise<ToolResult> {
  const baseUrl = params.config.baseUrl || defaultConfig.baseUrl;
  const { id } = params.params;

  if (!id || typeof id !== "string") {
    throw new Error("id is required and must be a string");
  }

  const result = await apiRequest(baseUrl, "GET", `/api/v1/item/${id}`);

  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  };
}

/**
 * Plugin entry point - OpenClaw plugin system will call this
 */
export function register(config: PluginConfig = defaultConfig): {
  tools: Array<{
    name: string;
    description: string;
    parameters: object;
    execute: (params: ToolExecuteParams) => Promise<ToolResult>;
  }>;
  configSchema?: object;
} {
  return {
    configSchema: {
      baseUrl: {
        type: "string",
        default: "http://localhost:3000",
        description: "KnowFlow API base URL"
      }
    },
    tools: [
      {
        name: "knowflow_record",
        description: "Create a KnowFlow knowledge item with OpenClaw attributes",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Item name (required)" },
            projectId: { type: "string", description: "OpenClaw project ID (required)" },
            type: { 
              type: "string", 
              description: "Archive type: requirement/code/test/document/flow_record",
              default: "document"
            },
            summary: { type: "string", description: "Item summary" },
            content: { type: "string", description: "Item content" },
            agent: { type: "string", description: "Agent source" },
            foldLevel: { 
              type: "number", 
              description: "Fold level: 1-3",
              default: 3
            }
          },
          required: ["name", "projectId"]
        },
        execute: knowflow_record
      },
      {
        name: "knowflow_search",
        description: "Search KnowFlow knowledge items",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            key: { type: "string", description: "Filter by key field" },
            keyValue: { type: "string", description: "Filter by key value" },
            sort: { 
              type: "string", 
              description: "Sort order",
              default: "recent"
            },
            page: { 
              type: "number", 
              description: "Page number",
              default: 1
            },
            pageSize: { 
              type: "number", 
              description: "Items per page",
              default: 20
            }
          }
        },
        execute: knowflow_search
      },
      {
        name: "knowflow_list",
        description: "List recent KnowFlow knowledge items",
        parameters: {
          type: "object",
          properties: {
            limit: { 
              type: "number", 
              description: "Maximum items to return",
              default: 20
            }
          }
        },
        execute: knowflow_list
      },
      {
        name: "knowflow_get",
        description: "Get a single KnowFlow item by ID",
        parameters: {
          type: "object",
          properties: {
            id: { type: "string", description: "Item ID (required)" }
          },
          required: ["id"]
        },
        execute: knowflow_get
      }
    ]
  };
}

export default register;