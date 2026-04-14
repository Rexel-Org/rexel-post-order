import { cn } from "@/lib/utils";

interface MaterialIconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
  style?: React.CSSProperties;
}

export function MaterialIcon({ name, className, size = 20, filled = false, style }: MaterialIconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
