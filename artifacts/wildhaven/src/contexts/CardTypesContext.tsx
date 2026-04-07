import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface CardType {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
}

interface CardTypesContextValue {
  types: CardType[];
  loading: boolean;
  refetch: () => void;
  getColor: (name: string) => string;
}

const CardTypesContext = createContext<CardTypesContextValue>({
  types: [],
  loading: false,
  refetch: () => {},
  getColor: () => "#6b7280",
});

export function CardTypesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/card-types`);
      const data = await res.json();
      setTypes(Array.isArray(data) ? data : []);
    } catch {
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const getColor = useCallback((name: string) => {
    return types.find(t => t.name === name)?.color ?? "#6b7280";
  }, [types]);

  return (
    <CardTypesContext.Provider value={{ types, loading, refetch, getColor }}>
      {children}
    </CardTypesContext.Provider>
  );
}

export function useCardTypes() {
  return useContext(CardTypesContext);
}
