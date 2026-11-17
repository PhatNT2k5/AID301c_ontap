import { useEffect, useState } from "react";

// Hash routing works from file:// and on any static host without rewrites.
export const useHashRoute = (): string[] => {
  const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [parts, setParts] = useState<string[]>(read);
  useEffect(() => {
    const onChange = () => {
      setParts(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parts;
};

export const navigate = (path: string): void => {
  window.location.hash = `#/${path}`;
};
