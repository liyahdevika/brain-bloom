import logo from "@/assets/brainbloom-logo.png";

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img src={logo} alt="" width={816} height={816} className={`${className} object-contain`} />
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-semibold text-sage-deep">BrainBloom</span>
    </span>
  );
}
