import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagOption {
  name: string;
  color: string;
}

interface TagsMultiSelectProps {
  options: TagOption[];
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagsMultiSelect({ options, value, onChange, disabled, placeholder = "No types", className }: TagsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(v => v !== name));
    } else {
      onChange([...value, name]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          "h-8 min-w-[120px] w-full flex items-center gap-1 px-2 py-1 rounded-md border border-input bg-background text-xs font-medium transition-colors",
          "hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:opacity-50 disabled:pointer-events-none",
          open && "ring-1 ring-ring"
        )}
      >
        <span className="flex-1 flex flex-wrap gap-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            value.map(tag => {
              const opt = options.find(o => o.name === tag);
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold border"
                  style={{ backgroundColor: (opt?.color ?? "#6b7280") + "22", borderColor: opt?.color ?? "#6b7280", color: opt?.color ?? "#6b7280", fontSize: "10px" }}
                >
                  {tag}
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); toggle(tag); }}
                    className="hover:opacity-70 cursor-pointer leading-none"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </span>
              );
            })
          )}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[160px] bg-popover border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">No types configured</div>
          ) : (
            options.map(opt => (
              <label
                key={opt.name}
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggle(opt.name)}
              >
                <div className={cn(
                  "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  value.includes(opt.name) ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {value.includes(opt.name) && (
                    <svg viewBox="0 0 10 10" className="w-2 h-2 text-white fill-current">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold border"
                  style={{ backgroundColor: opt.color + "22", borderColor: opt.color, color: opt.color, fontSize: "10px" }}
                >
                  {opt.name}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
