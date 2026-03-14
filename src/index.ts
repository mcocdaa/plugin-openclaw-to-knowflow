/**
 * KnowFlow OpenClaw Plugin
 * Registers 4 agent tools for KnowFlow knowledge management
 */

const DEFAULT_BASE_URL = "http://localhost:3000";

/**
 * HTTP request helper for KnowFlow API
 */
async function apiRequest(
  baseUrl: string,
  method: string,
  path: string,
  body?: object
): Promise<unknown> {
  const url = `${baseUrl}${path}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KnowFlow API error ${response.status}: ${errorText}`);
  }
  return response.json();
}

/**
 * Resolve baseUrl from plugin config
 */
function getBaseUrl(api: any): string {
  try {
    const cfg = api.getConfig?.() || {};
    return cfg.baseUrl || DEFAULT_BASE_URL;
  } catch {
    return DEFAULT_BASE_URL;
  }
}

/**
 * Plugin entry point - standard OpenClaw format
 */
export default function (api: any) {
  api.logger?.info?.("[knowflow] KnowFlow plugin loading...");

  // Tool 1: knowflow_record
  api.registerTool({
    name: "knowflow_record",
    description:
      "Create a KnowFlow knowledge item with OpenClaw attributes. Use when you need to record a document, decision, error log, or any structured knowledge into KnowFlow.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name" },
        projectId: { type: "string", description: "OpenClaw project ID" },
        type: {
          type: "string",
          description:
            "Archive type: requirement / code / test / document / flow_record",
          default: "document",
        },
        summary: { type: "string", description: "One-line summary" },
        content: { type: "string", description: "Item content body" },
        agent: { type: "string", description: "Source agent id" },
        foldLevel: {
          type: "number",
          description: "Fold level 1-3 (1=summary only, 3=full)",
          default: 3,
        },
      },
      required: ["name", "projectId"],
    },
    async execute(_id: string, params: any) {
      const baseUrl = getBaseUrl(api);
      const {
        name,
        projectId,
        type = "document",
        summary = "",
        content = "",
        agent = "",
        foldLevel = 3,
      } = params;

      // Step 1: Create item
      const createResult = (await apiRequest(baseUrl, "POST", "/api/v1/item", {
        name,
        keyValues: { name, file_path: content, file_type: "text/plain" },
      })) as any;

      const itemId = createResult.item.id;

      // Step 2: Set OpenClaw attributes
      await apiRequest(
        baseUrl,
        "PUT",
        `/api/v1/plugins/knowflow_openclaw/items/${itemId}/openclaw`,
        {
          openclaw_project_id: projectId,
          openclaw_archive_type: type,
          openclaw_fold_level: foldLevel,
          openclaw_agent_source: agent,
          openclaw_summary: summary,
          openclaw_flow_id: "",
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              item_id: itemId,
              name,
              project_id: projectId,
              archive_type: type,
              summary,
            }),
          },
        ],
      };
    },
  });

  // Tool 2: knowflow_search
  api.registerTool({
    name: "knowflow_search",
    description:
      "Search KnowFlow knowledge items by keyword, key field, or key value.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        key: { type: "string", description: "Filter by key field name" },
        keyValue: { type: "string", description: "Filter by key field value" },
        sort: { type: "string", description: "Sort: recent / name", default: "recent" },
        page: { type: "number", description: "Page number", default: 1 },
        pageSize: { type: "number", description: "Items per page", default: 20 },
      },
    },
    async execute(_id: string, params: any) {
      const baseUrl = getBaseUrl(api);
      const qs = new URLSearchParams();
      if (params.query) qs.set("q", params.query);
      if (params.key) qs.set("key", params.key);
      if (params.keyValue) qs.set("key_value", params.keyValue);
      qs.set("sort", params.sort || "recent");
      qs.set("page", String(params.page || 1));
      qs.set("page_size", String(params.pageSize || 20));

      const result = await apiRequest(baseUrl, "GET", `/api/v1/item/search?${qs.toString()}`);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  });

  // Tool 3: knowflow_list
  api.registerTool({
    name: "knowflow_list",
    description: "List recent KnowFlow knowledge items.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max items to return", default: 20 },
      },
    },
    async execute(_id: string, params: any) {
      const baseUrl = getBaseUrl(api);
      const limit = params.limit || 20;
      const result = await apiRequest(
        baseUrl,
        "GET",
        `/api/v1/item/search?sort=recent&page_size=${limit}`
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  });

  // Tool 4: knowflow_get
  api.registerTool({
    name: "knowflow_get",
    description: "Get a single KnowFlow knowledge item by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Item ID" },
      },
      required: ["id"],
    },
    async execute(_id: string, params: any) {
      const baseUrl = getBaseUrl(api);
      const result = await apiRequest(baseUrl, "GET", `/api/v1/item/${params.id}`);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  });

  api.logger?.info?.("[knowflow] KnowFlow plugin loaded: 4 tools registered");
}
