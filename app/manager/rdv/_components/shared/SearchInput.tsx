"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export const SearchInput = memo(function SearchInput({
  initialSearch,
  onDebouncedSearch,
}: {
  initialSearch: string;
  onDebouncedSearch: (value: string) => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => onDebouncedSearch(search), 200);
    return () => clearTimeout(timeout);
  }, [search, onDebouncedSearch]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="rdv-search-shell">
      <div className="rdv-search-box">
        <Search size={16} aria-hidden />
        <input
          ref={searchRef}
          className="rdv-input"
          placeholder="Rechercher un contact, une entreprise ou un SDR"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <kbd>Ctrl K</kbd>
      </div>
    </div>
  );
});
