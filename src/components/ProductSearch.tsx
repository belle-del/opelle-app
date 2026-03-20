"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Package, Search } from "lucide-react";
import type { Product } from "@/lib/types";

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
  defaultValue?: string;
}

const categoryLabels: Record<string, string> = {
  permanent: "Permanent",
  "demi-permanent": "Demi-Permanent",
  "semi-permanent": "Semi-Permanent",
  lightener: "Lightener",
  toner: "Toner",
  developer: "Developer",
  additive: "Additive",
  other: "Other",
};

export function ProductSearch({ onSelect, placeholder, defaultValue }: ProductSearchProps) {
  const [query, setQuery] = useState(defaultValue || "");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (product: Product) => {
    setQuery(`${product.brand} ${product.shade}${product.name ? ` - ${product.name}` : ""}`);
    setIsOpen(false);
    onSelect(product);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder || "Search products by brand, shade, or name..."}
          className="pl-9"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/20 bg-black/90 backdrop-blur-xl shadow-xl max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No products found
            </div>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {product.brand} {product.shade}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {product.line || categoryLabels[product.category]}
                    {product.name ? ` - ${product.name}` : ""}
                  </p>
                </div>
                {product.quantity > 0 && (
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: product.quantity <= product.lowStockThreshold
                        ? "var(--brass-warm)"
                        : "var(--brass)"
                    }}
                  >
                    Qty: {product.quantity}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
