export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 52" className="w-[46px] h-10" aria-hidden="true">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb066" /><stop offset="1" stopColor="#ff6a00" /></linearGradient></defs>
        <path d="M24 3h19c12 0 20 8 20 20s-8 20-20 20H29l5-9h9c6 0 11-5 11-11s-5-11-11-11H20z" fill="url(#g)" />
        <rect x="2" y="16" width="26" height="4" rx="2" fill="#ff7a1a" /><rect x="8" y="24" width="20" height="4" rx="2" fill="#ff7a1a" /><rect x="14" y="32" width="14" height="4" rx="2" fill="#ff7a1a" />
        <path d="M37 44c3 4 5 6 5 8a5 5 0 0 1-10 0c0-2 2-4 5-8z" transform="translate(-3 -3) scale(.8)" fill="#ff7a1a" />
      </svg>
      <div dir="ltr">
        <b className="block text-[22px] tracking-wider font-sans">DRIP <span className="text-brand">WASH</span></b>
        <small className="block text-mut text-[11px]">Clean • Shine • Protect</small>
      </div>
    </div>
  );
}
