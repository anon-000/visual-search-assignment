const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Product {
  product_id: string;
  name: string;
  category: string;
  images: string[];
}

export interface TaskInfo {
  id: string;
  status: string;
  total_count: number;
  processed_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  product: Product;
  score: number;
  matched_image_url: string;
}

export async function fetchProducts(
  skip = 0,
  limit = 200,
  category?: string
): Promise<Product[]> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  if (category) params.set("category", category);
  const res = await fetch(`${API_BASE}/products?${params}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function triggerIngest(sourceUrl: string): Promise<TaskInfo> {
  const res = await fetch(`${API_BASE}/tasks/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_url: sourceUrl }),
  });
  if (!res.ok) throw new Error("Failed to trigger ingest");
  return res.json();
}

export async function getTask(taskId: string): Promise<TaskInfo> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

export async function searchByImage(file: File): Promise<SearchResult[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}
