import { cn } from "@/lib/utils";

interface UnilabsLogoProps {
  className?: string;
  size?: number;
}

export function UnilabsLogo({ className, size = 32 }: UnilabsLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Unilabs sun/star logo */}
      {/* Orange rays */}
      <g fill="#F5A623">
        {/* Top */}
        <rect x="45" y="5" width="10" height="22" rx="4" />
        {/* Top-right */}
        <rect x="64" y="12" width="10" height="22" rx="4" transform="rotate(45 69 23)" />
        {/* Right */}
        <rect x="73" y="45" width="22" height="10" rx="4" />
        {/* Bottom-right */}
        <rect x="64" y="66" width="10" height="22" rx="4" transform="rotate(-45 69 77)" />
        {/* Bottom */}
        <rect x="45" y="73" width="10" height="22" rx="4" />
        {/* Bottom-left */}
        <rect x="26" y="66" width="10" height="22" rx="4" transform="rotate(45 31 77)" />
        {/* Left */}
        <rect x="5" y="45" width="22" height="10" rx="4" />
        {/* Top-left */}
        <rect x="26" y="12" width="10" height="22" rx="4" transform="rotate(-45 31 23)" />
      </g>
      {/* Red/orange inner accents */}
      <g fill="#E25B2D">
        <circle cx="50" cy="28" r="6" />
        <circle cx="72" cy="50" r="6" />
        <circle cx="50" cy="72" r="6" />
        <circle cx="28" cy="50" r="6" />
      </g>
    </svg>
  );
}
