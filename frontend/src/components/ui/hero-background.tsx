export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#140e1d]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_72%_36%,rgba(249,115,22,0.48),transparent_75%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_75%_at_70%_35%,#000_40%,transparent_100%)]" />
    </div>
  )
}
