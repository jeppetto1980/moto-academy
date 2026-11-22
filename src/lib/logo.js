// Logo Moto Academy: ruota a raggi con gomma in evidenza e monogramma "MA" in corsivo.
// Lo stesso disegno è usato per l'icona dell'app (public/icon.svg), la barra in alto e le carene della moto.

export const LOGO_ORANGE = '#ff6a1a'
export const LOGO_AMBER = '#ffb03a'

// Disegna il logo su un canvas 2D, centrato in (cx, cy) con raggio r:
// ruota a raggi con gomma dal battistrada evidente e monogramma "MA" in corsivo.
export function drawLogo(ctx, cx, cy, r, { color = LOGO_ORANGE, color2 = LOGO_AMBER } = {}) {
  const k = r / 234 // scala rispetto all'icona da 512 px
  ctx.save()
  ctx.translate(cx, cy)
  const g = ctx.createLinearGradient(-r, -r, r, r)
  g.addColorStop(0, color)
  g.addColorStop(1, color2)
  // gomma con volume
  const t = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  t.addColorStop(0.68, '#3a3e46')
  t.addColorStop(0.82, '#5d626d')
  t.addColorStop(0.93, '#454952')
  t.addColorStop(1, '#25272d')
  ctx.fillStyle = t
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0d0f14'
  ctx.beginPath()
  ctx.arc(0, 0, 166 * k, 0, Math.PI * 2)
  ctx.fill()
  // raggi
  ctx.strokeStyle = '#4a505c'
  ctx.lineWidth = 4 * k
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI) / 9
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 30 * k, Math.sin(a) * 30 * k)
    ctx.lineTo(Math.cos(a + 0.5) * 150 * k, Math.sin(a + 0.5) * 150 * k)
    ctx.stroke()
  }
  // battistrada a spina di pesce
  ctx.strokeStyle = '#0b0c0f'
  ctx.lineCap = 'round'
  ctx.lineWidth = 11 * k
  const N = 26
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    for (const [r1, r2, da, sk] of [
      [229, 211, 0, 0.07],
      [209, 193, Math.PI / N, -0.07],
    ]) {
      const aa = a + da
      ctx.beginPath()
      ctx.moveTo(Math.cos(aa) * r1 * k, Math.sin(aa) * r1 * k)
      ctx.lineTo(Math.cos(aa + sk) * r2 * k, Math.sin(aa + sk) * r2 * k)
      ctx.stroke()
    }
  }
  // cerchio, filetto e mozzo
  ctx.strokeStyle = '#d3d8df'
  ctx.lineWidth = 10 * k
  ctx.beginPath()
  ctx.arc(0, 0, 164 * k, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = g
  ctx.lineWidth = 5 * k
  ctx.beginPath()
  ctx.arc(0, 0, 152 * k, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#d3d8df'
  ctx.beginPath()
  ctx.arc(0, 0, 24 * k, 0, Math.PI * 2)
  ctx.fill()
  // targhetta con "MA"
  ctx.fillStyle = 'rgba(13,15,20,0.9)'
  const w = 312 * k
  const h = 116 * k
  const rr = 24 * k
  ctx.beginPath()
  ctx.moveTo(-w / 2 + rr, -h / 2)
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, rr)
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, rr)
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, rr)
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, rr)
  ctx.fill()
  ctx.fillStyle = g
  ctx.font = `italic 900 ${126 * k}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('MA', 2 * k, 6 * k)
  ctx.restore()
}
