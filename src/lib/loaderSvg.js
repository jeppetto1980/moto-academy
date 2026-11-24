// Disegno della moto usato dalle schermate di caricamento (stesso markup di index.html)
export const BIKE_SVG = `
<svg class="ld-bike" viewBox="0 0 200 112" aria-hidden="true">
  <defs>
    <linearGradient id="ldg" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#ff6a1a"/><stop offset="1" stop-color="#ffb03a"/>
    </linearGradient>
    <clipPath id="ldc">
      <path d="M14 42 L30 39 L66 43 L78 31 Q96 23 116 26 L130 32 L142 39 L147 50 L132 52 L121 50 L117 70 Q100 79 84 73 L76 57 L60 55 L40 51 Z"/>
      <circle cx="42" cy="80" r="24"/><circle cx="160" cy="80" r="24"/>
      <path d="M42 80 L86 66 L90 72 L44 86 Z"/><path d="M138 40 L163 80 L157 82 L133 43 Z"/>
      <path d="M96 74 L150 66 L152 72 L100 80 Z"/>
    </clipPath>
  </defs>
  <g clip-path="url(#ldc)">
    <rect x="0" y="0" width="200" height="112" fill="currentColor" opacity=".13"/>
    <rect class="ld-fill" x="0" y="0" width="0" height="112" fill="url(#ldg)"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity=".85">
    <path d="M14 42 L30 39 L66 43 L78 31 Q96 23 116 26 L130 32 L142 39 L147 50 L132 52 L121 50 L117 70 Q100 79 84 73 L76 57 L60 55 L40 51 Z"/>
    <circle cx="42" cy="80" r="24"/><circle cx="160" cy="80" r="24"/>
    <path d="M42 80 L88 69"/><path d="M135 41 L160 80"/><path d="M98 77 L151 69"/>
    <path d="M131 33 L126 21 L138 17"/>
  </g>
  <g class="ld-spin" stroke="currentColor" stroke-width="1.6" opacity=".7">
    <circle cx="42" cy="80" r="15" fill="none" stroke-dasharray="3 4"/>
    <path d="M42 66 V94 M28 80 H56 M32 70 L52 90 M52 70 L32 90"/>
  </g>
  <g class="ld-spin" stroke="currentColor" stroke-width="1.6" opacity=".7">
    <circle cx="160" cy="80" r="15" fill="none" stroke-dasharray="3 4"/>
    <path d="M160 66 V94 M146 80 H174 M150 70 L170 90 M170 70 L150 90"/>
  </g>
  <line class="ld-road" x1="-20" y1="107" x2="220" y2="107" stroke="currentColor" stroke-width="2.5" stroke-dasharray="14 10" opacity=".35"/>
  <g class="ld-wind" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".4">
    <path d="M2 30 H10"/><path d="M0 58 H8"/><path d="M4 70 H12"/>
  </g>
</svg>`
