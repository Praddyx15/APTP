import { TrendingUp } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  subtitleColor?: "amber" | "green" | "slate";
}

export default function StatsCard({
  title,
  value,
  trend,
  trendUp = false,
  subtitle,
  subtitleColor = "slate"
}: StatsCardProps) {
  const subtitleColorClasses = {
    amber: "text-amber-600",
    green: "text-green-600",
    slate: "text-slate-600"
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <div className="flex items-baseline">
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
        {trend && (
          <span className={`ml-2 text-xs ${trendUp ? 'text-green-600' : 'text-red-600'} font-medium flex items-center`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </span>
        )}
        {subtitle && (
          <span className={`ml-2 text-xs ${subtitleColorClasses[subtitleColor]} font-medium`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
