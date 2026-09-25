/**
 * Ondas decorativas no fundo das telas de autenticação (Login, Cadastro, Confirmação de e-mail, 2FA
 * obrigatório). Três camadas SVG em tons de indigo com opacidade baixa, deslizando em velocidades e
 * direções diferentes (parallax sutil). O container pai precisa de `relative overflow-hidden`, e o
 * conteúdo da página de `relative z-10` para ficar por cima. Respeita `prefers-reduced-motion`.
 */
export function AuthWaves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="animate-wave-drift absolute bottom-0 left-0 h-56 w-[200%] text-indigo-400/[0.12]"
        style={{ animationDuration: '26s' }}
        viewBox="0 0 2880 320"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,160 C240,220 480,100 720,160 C960,220 1200,100 1440,160 C1680,220 1920,100 2160,160 C2400,220 2640,100 2880,160 L2880,320 L0,320 Z" />
      </svg>
      <svg
        className="animate-wave-drift absolute bottom-0 left-0 h-40 w-[200%] text-indigo-300/[0.08]"
        style={{ animationDuration: '38s', animationDirection: 'reverse' }}
        viewBox="0 0 2880 320"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,180 C240,120 480,240 720,180 C960,120 1200,240 1440,180 C1680,120 1920,240 2160,180 C2400,120 2640,240 2880,180 L2880,320 L0,320 Z" />
      </svg>
      <svg
        className="animate-wave-drift absolute bottom-0 left-0 h-72 w-[200%] text-indigo-200/[0.06]"
        style={{ animationDuration: '32s' }}
        viewBox="0 0 2880 320"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,140 C240,200 480,80 720,140 C960,200 1200,80 1440,140 C1680,200 1920,80 2160,140 C2400,200 2640,80 2880,140 L2880,320 L0,320 Z" />
      </svg>
    </div>
  );
}
