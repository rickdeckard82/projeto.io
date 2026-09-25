/**
 * Ondas decorativas baixas para barras (cabeçalho e rodapé do AppShell) — mesma ideia do `AuthWaves`,
 * só que achatadas: duas camadas SVG em indigo com opacidade baixa, deslizando em sentidos opostos.
 * O container pai precisa de `relative`, e o conteúdo da barra de `relative z-10` para ficar por cima.
 */
export function BarWaves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="animate-wave-drift absolute bottom-0 left-0 h-16 w-[200%] text-indigo-400/[0.12]"
        style={{ animationDuration: '26s' }}
        viewBox="0 0 2880 120"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,55 C240,75 480,35 720,55 C960,75 1200,35 1440,55 C1680,75 1920,35 2160,55 C2400,75 2640,35 2880,55 L2880,120 L0,120 Z" />
      </svg>
      <svg
        className="animate-wave-drift absolute bottom-0 left-0 h-12 w-[200%] text-indigo-300/[0.08]"
        style={{ animationDuration: '38s', animationDirection: 'reverse' }}
        viewBox="0 0 2880 120"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,62 C240,42 480,82 720,62 C960,42 1200,82 1440,62 C1680,42 1920,82 2160,62 C2400,42 2640,82 2880,62 L2880,120 L0,120 Z" />
      </svg>
    </div>
  );
}
