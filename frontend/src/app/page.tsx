"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProducts,
  triggerIngest,
  getTask,
  searchByImage,
  type Product,
  type SearchResult,
  type TaskInfo,
} from "@/lib/api";

const SOURCE_URL =
  "https://drive.google.com/uc?export=download&id=1pyfIvm5kFN7KzkxS8d5mNrfFBxtGapo3";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load products on mount
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Poll task progress
  const startPolling = useCallback((taskId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const t = await getTask(taskId);
        setTask(t);
        if (t.status === "completed" || t.status === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setSyncing(false);
          if (t.status === "completed") {
            const fresh = await fetchProducts();
            setProducts(fresh);
          }
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setSyncing(false);
      }
    }, 2000);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const t = await triggerIngest(SOURCE_URL);
      setTask(t);
      startPolling(t.id);
    } catch {
      setSyncing(false);
    }
  };

  const handleImageSearch = async (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    setSearchResults(null);
    setIsSearching(true);
    try {
      const results = await searchByImage(file);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setPreviewUrl(null);
    setSearchQuery("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // Filter products by name
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const taskProgress =
    task && task.total_count > 0
      ? Math.round((task.processed_count / task.total_count) * 100)
      : 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Task Progress Bar ── */}
      {task && (task.status === "pending" || task.status === "processing") && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-primary animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm font-medium text-indigo-700">
                  {task.status === "pending"
                    ? "Preparing to index images..."
                    : `Indexing images... ${task.processed_count} / ${task.total_count} products`}
                </span>
              </div>
              <span className="text-sm font-mono text-indigo-600">
                {taskProgress}%
              </span>
            </div>
            <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completed banner */}
      {task && task.status === "completed" && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-sm text-emerald-700">
              Sync complete &mdash; {task.total_count} products indexed.
            </span>
            <button
              onClick={() => setTask(null)}
              className="text-emerald-500 hover:text-emerald-700 text-sm cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Failed banner */}
      {task && task.status === "failed" && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-sm text-red-700">
              Sync failed: {task.error ?? "Unknown error"}
            </span>
            <button
              onClick={() => setTask(null)}
              className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight shrink-0">
            Flow Automate Assignment
          </h1>

          {/* Name search */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchResults) {
                  setSearchResults(null);
                  setPreviewUrl(null);
                }
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Image search */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSearch(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isSearching}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Search by Image
            </button>

            {/* Sync */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Products
            </button>

            {/* Clear */}
            {(searchResults || searchQuery) && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Image search results section */}
        {(isSearching || searchResults) && (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              {previewUrl && (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Query"
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                  {isSearching && (
                    <div className="absolute inset-0 rounded-lg bg-primary/10 search-pulse" />
                  )}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {isSearching
                    ? "Searching for similar products..."
                    : "Similar Products"}
                </h2>
                {searchResults && (
                  <p className="text-sm text-muted">
                    Found {searchResults.length} match
                    {searchResults.length !== 1 ? "es" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Skeleton animation while searching */}
            {isSearching && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <div className="skeleton w-full h-48 mb-3" />
                    <div className="skeleton h-4 w-3/4 mb-2" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Results cards */}
            {searchResults && searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {searchResults.map((r, i) => (
                  <div
                    key={r.product.product_id}
                    className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.matched_image_url}
                        alt={r.product.name}
                        className="w-full h-56 object-cover"
                      />
                      <span className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-md">
                        #{i + 1}
                      </span>
                      <span className="absolute top-2 right-2 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded-md">
                        {(r.score * 100).toFixed(1)}% match
                      </span>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm leading-snug line-clamp-2">
                        {r.product.name}
                      </h3>
                      <span className="inline-block mt-1.5 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {r.product.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.length === 0 && (
              <p className="text-muted text-sm">No similar products found.</p>
            )}

            <hr className="mt-6 border-border" />
          </div>
        )}

        {/* ── Product Grid ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            All Products
            {searchQuery && (
              <span className="text-sm font-normal text-muted ml-2">
                ({filtered.length} result{filtered.length !== 1 ? "s" : ""})
              </span>
            )}
          </h2>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="skeleton w-full h-40 mb-3" />
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">
              {products.length === 0
                ? 'Click "Sync Products" to load the catalog.'
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((p) => (
              <div
                key={p.product_id}
                className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {p.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-muted text-xs">
                    No image
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-medium text-sm leading-snug line-clamp-2">
                    {p.name}
                  </h3>
                  <span className="inline-block mt-1.5 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {p.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
