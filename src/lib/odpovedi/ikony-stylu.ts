// Ikony stylů kolem tlačítka ucha (13. 11. 2026). Vlastní jednoduché čárové kresby 24 × 24, žádné obrázky postav:
// skateboard, planetka s hvězdou, hrnec medu, sloup, smutný robot, razítko a brk. Kreslí se tahem currentColor.
import type { KlicStylu } from './mluvci';

export const IKONY_STYLU: Record<KlicStylu, string> = {
  spisovne: '<path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Z"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.2M8.6 21.2h6.8"/>',
  bart: '<path d="M3 11.5h18l-1.2 1.6a2 2 0 0 1-1.6.8H5.8a2 2 0 0 1-1.6-.8Z"/><circle cx="7.5" cy="17" r="1.7"/><circle cx="16.5" cy="17" r="1.7"/><path d="M7.5 13.9v1.4M16.5 13.9v1.4"/>',
  'maly-princ': '<circle cx="10" cy="14" r="5.5"/><path d="M3.6 16.3c3.6 1.6 8.9 1.4 12.6-.8"/><path d="M18 3l.8 1.9 2 .2-1.5 1.3.5 2-1.8-1.1-1.8 1.1.5-2-1.5-1.3 2-.2Z"/>',
  pu: '<path d="M7 8.5h10l.8 3.5a6 6 0 0 1-1.1 5.3A4.5 4.5 0 0 1 13.2 19h-2.4a4.5 4.5 0 0 1-3.5-1.7A6 6 0 0 1 6.2 12Z"/><path d="M6 8.5h12M8.5 5.5h7"/><path d="M10 8.5v3a1.2 1.2 0 0 0 2.4 0"/>',
  sokrates: '<path d="M4.5 4h15M6 6.5h12M6 18h12M4.5 20.5h15"/><path d="M8 6.5V18M12 6.5V18M16 6.5V18"/>',
  marvin: '<rect x="5" y="7.5" width="14" height="11" rx="2.5"/><path d="M12 7.5V5"/><circle cx="12" cy="3.8" r="1"/><circle cx="9.3" cy="12" r="1.2"/><circle cx="14.7" cy="12" r="1.2"/><path d="M9.5 16.2c1.6-.9 3.4-.9 5 0"/>',
  urednik: '<path d="M10 3.5h4v5.5l1.5 2.5h-7L10 9Z"/><rect x="5" y="11.5" width="14" height="4" rx="1"/><path d="M5 19h14"/>',
  starocestina: '<path d="M20 4c-6.5 1.5-10.5 6-12 13"/><path d="M20 4c-.5 5.5-4 9.5-10.6 11.2"/><path d="M8 17l-3 3"/>',
};
