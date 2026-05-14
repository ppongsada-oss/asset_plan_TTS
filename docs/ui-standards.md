# Asset Plan UI Design Standards (Table Layout)

This document records the standard format for data tables in the Asset Plan project, ensuring a consistent and premium UX/UI across all modules.

## 1. Table Structure & Typography
- **Table Layout**: Always use `whitespace-nowrap` for rows to keep data organized, but use `whitespace-normal` + `max-w` for long text like Project/Item names.
- **Font Sizes**:
    - Table Headers: `text-sm font-medium text-slate-600`
    - Primary Data: `text-sm font-medium text-slate-800`
    - Secondary/Meta Data: `text-[10px] text-slate-400 font-mono`

## 2. Standard Column Layouts

### A. Equipment / Item Column (Two-Line Format)
Used when displaying assets with codes and units.
```tsx
<td className="px-3 py-4 border-r border-slate-50 max-w-[200px] whitespace-normal">
  <div className="font-bold text-sm text-slate-800">
    {item_name}
  </div>
  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
    {item_code} ({unit})
  </div>
</td>
```

### B. Project Column (Tooltip Format)
Used to show full project name while keeping the code accessible.
```tsx
<td className="px-3 py-4 max-w-[150px] whitespace-normal" title={`รหัสโครงการ: ${project_code}`}>
  {project_name}
</td>
```

### C. Status Column (Vertical Badges + History)
Always located at the **far right** or **second to last**. Groups history and labels vertically.
- **Badges**: Use color-coded borders and backgrounds (Indigo, Emerald, Rose).
- **Edit/History Button**: Small, neat button at the bottom of the badges.
```tsx
<div className="flex flex-col gap-1 items-center">
  {/* Badges here */}
  <button className="flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 bg-white border border-slate-200 rounded">
    <History size={10} /> แก้ไข
  </button>
</div>
```

### D. Actions Column (Horizontal Icons)
Located **before** the Status column. Buttons should be grouped horizontally with tooltips.
```tsx
<div className="flex flex-row items-center gap-1">
  <button className="p-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100">
    <Icon size={14} />
  </button>
</div>
```

## 3. Row State Styles
- **Active/Pending**: Standard white background with `hover:bg-slate-50`.
- **Selected**: `bg-indigo-50/50`.
- **Completed/Finalized**: Apply `bg-slate-50/80 grayscale-[0.5] opacity-75` to the entire row to visually de-prioritize it.

## 4. Header Styling
- Concise labels.
- Indigo primary color for action headers.
- Slate color for metadata headers.
- Fixed widths (`w-[Xpx]`) for status and action columns to prevent layout shifts.

---
*Created on: 2026-05-08 based on Store Center Hub refinement.*
