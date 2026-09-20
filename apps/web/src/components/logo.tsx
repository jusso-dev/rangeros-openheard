// Official RangerOS mark, shared with the RangerOS application.
export default function Logo({ size = 28 }: { size?: number }) {
  return <img src="/rangeros-mark.svg" width={size} height={size} alt="RangerOS" className="shrink-0 object-contain" />;
}
