# Módulo Landing

## Ubicación
- `frontend/src/app/features/landing/`

## Archivos
| Archivo | Propósito |
|---------|-----------|
| `landing.component.ts` | Lógica del componente (sin estilos inline) |
| `landing.component.html` | HTML con todas las secciones del landing |
| `landing.component.css` | Todos los estilos del landing (autocontenido) |

## Independencia de estilos

El landing es **completamente autocontenido**. Todos los estilos y variables CSS están declarados dentro de `landing.component.css` en el `:host`.

### Variables CSS definidas localmente

```css
:host {
  /* Tipografía */
  --ff-display: 'Playfair Display', Georgia, serif;
  --ff-body: 'Inter', system-ui, sans-serif;
  --ff-ui: 'DM Sans', system-ui, sans-serif;

  /* Brand gradient */
  --brand-gradient: linear-gradient(90deg, #0457BF, #0298E2, #0DACA2, #24CFA0);

  /* Bordes */
  --r: 6px;
  --r-lg: 12px;

  /* Paleta de colores principal */
  --navy: #04294F;
  --cyan: #0298E2;
  --green: #24CFA0;
  --slate: #0457BF;
  --teal: #0DACA2;
  --mid: #1E3160;
  --light: #E8F6FB;
  --white: #FFFFFF;
  --off: #F4F8FB;
  --border: #D0E6F0;
  --muted: #6B8099;

  /* Paleta sección Cover */
  --pc-navy-950: #03142A;
  --pc-navy-900: #041C36;
  --pc-navy-800: #0A2A4A;
  --pc-azure: #2E86EB;
  --pc-azure-light: #5FA8F5;
  --pc-mint: #2BC48A;
  --pc-ice: #C7DAEC;
  --pc-white: #FFFFFF;
  --pc-line: rgba(95, 168, 245, .14);
}
```

### No requiere estilos globales
- `frontend/src/styles.css` está vacío (solo comentario)
- No depende de Bootstrap ni de ningún otro framework CSS externo
- Las únicas dependencias externas son Google Fonts (cargadas via `@import` en el CSS)

### Secciones del landing

| Sección | Clase CSS | Contenido |
|---------|-----------|-----------|
| Portada | `.cover` | Hero con SVG animado, isotipo, título, tagline |
| Quiénes somos | `.about` | Grid con pillars y quote block |
| Servicios | `.services` | 3 bloques: Formaciones, Auditorías, Tecnología |
| ROI | `.roi` | Tabla de 5 beneficios con impact chips |
| Metodología | `.method` | 4 pasos con conectores |
| Autoridad | `.authority` | Credenciales del equipo |
| CTA | `.cta` | Botones de contacto y redes |
| Footer | `footer` | Copyright y marca |

### Sistema de animaciones
- **Reveal system**: Clases `.reveal` con delays `.d1` a `.d5`
  - `opacity: 0 → 1`, `translateY(32px) → 0`
  - Transición con cubic-bezier suave (0.7s)
- **Cover animations**: SVG `draw` (2.2s), contenido `rise` (0.8s)
- Respeta `prefers-reduced-motion`

### Imágenes y assets
Las imágenes del landing están en `frontend/src/assets/landing/`:
- `brand-mark.png` - Isotipo
- `hero-flow.png` - Imagen de fondo del hero
- `service-training.png` - Icono formación
- `service-analytics.png` - Icono auditoría
- `service-technology.png` - Icono tecnología

### Responsive
- **Tablet (<900px)**: Una columna, hero oculta lado derecho
- **Móvil (<640px)**: Tabla ROI → tarjetas apiladas, botones full-width