export const COLORS = {
  bg: "#1B1310",
  panel: "#241A16",
  panelAlt: "#2C201B",
  border: "#3A2B24",
  ember: "#D6491F",
  emberDark: "#B33A17",
  amber: "#E8A33D",
  cream: "#F5EEE4",
  muted: "#B8A99B",
  sage: "#6FA287",
  warn: "#D6491F",
};

export const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
  * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
  .display { font-family: 'Oswald', sans-serif; letter-spacing: 0.01em; }
  button { font-family: inherit; }
  input:focus, select:focus { outline: 2px solid ${COLORS.amber}; outline-offset: 1px; }
  button:focus-visible { outline: 2px solid ${COLORS.amber}; outline-offset: 2px; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
  input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
`;

export const PRINT_STYLE = `
  .print-only { display: none; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    .print-page { color: #1B1310; background: #fff; padding: 24px; }
    .print-header { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
    .print-sub { font-size: 13px; color: #555; margin-bottom: 18px; }
    .print-section-title {
      font-weight: 700; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase;
      border-bottom: 2px solid #1B1310; padding-bottom: 4px; margin-top: 18px; margin-bottom: 6px;
    }
    .print-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ddd; font-size: 13px; }
    .print-row.total {
      font-weight: 700; font-size: 14px; border-top: 2px solid #1B1310; border-bottom: none;
      margin-top: 6px; padding-top: 8px;
    }
    .print-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
    .print-table th {
      text-align: left; border-bottom: 2px solid #1B1310; padding: 4px 6px;
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .print-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
    .print-badge-low { color: #B33A17; font-weight: 700; }
    .print-grid-hdr { font-weight: 700; font-size: 12px; margin-top: 10px; color: #333; }
  }
`;
