"use client";

import { useState } from "react";
import WorkSheet from "@/components/work/WorkSheet";
import { workApi } from "@/lib/work/api";
import type { WorkCategoryDTO } from "@/lib/work/types";

export default function ArchivedCategoriesSheet({
  categories,
  onClose,
  onChanged,
}: {
  categories: WorkCategoryDTO[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function restore(category: WorkCategoryDTO) {
    setError(null);
    try {
      await workApi(`/categories/${category._id}`, "PATCH", { archived: false });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <WorkSheet title="Archived buttons" onClose={onClose}>
      {categories.length === 0 ? (
        <p className="font-body text-sm text-muted">Nothing archived.</p>
      ) : (
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <li key={category._id} className="flex items-center justify-between gap-3 min-h-[44px]">
              <span className="min-w-0 truncate font-body text-sm text-text">{category.label}</span>
              <button
                onClick={() => restore(category)}
                aria-label={`Restore ${category.label}`}
                className="min-h-[44px] px-2 -mr-2 font-body text-sm text-gold"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="font-body text-sm text-burgundy-light">{error}</p>}
    </WorkSheet>
  );
}
