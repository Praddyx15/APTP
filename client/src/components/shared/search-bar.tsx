import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ placeholder = "Search...", value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-400" />
      </div>
      <Input
        type="text"
        className="py-2 pl-10 pr-4 block w-full rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
