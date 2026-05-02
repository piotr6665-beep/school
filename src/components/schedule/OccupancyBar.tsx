import { useTranslation } from "react-i18next";

interface Props {
  available: number;
  max: number;
  className?: string;
}

const OccupancyBar = ({ available, max, className = "" }: Props) => {
  const { t } = useTranslation();
  const taken = Math.max(0, max - available);
  const pct = max > 0 ? Math.min(100, Math.round((taken / max) * 100)) : 0;

  // Colour bands by occupancy
  let barColor = "bg-emerald-500";
  if (pct >= 100) barColor = "bg-destructive";
  else if (pct >= 80) barColor = "bg-amber-500";
  else if (pct >= 50) barColor = "bg-yellow-500";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t('schedule.occupancy', { taken, max })}</span>
        <span className="font-medium">{available} {t('schedule.spots')}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary border border-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
          aria-label={`${pct}%`}
        />
      </div>
    </div>
  );
};

export default OccupancyBar;
