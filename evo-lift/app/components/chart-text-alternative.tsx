import type { ChartTextAlternativeModel } from "@/app/components/chart-text-data";

type ChartSeriesLegendItem = {
  key: string;
  label: string;
  /** Tailwind classes for a decorative swatch. The label is the series name. */
  swatchClassName: string;
};

/**
 * Names each series in text. The swatch repeats the chart color; it is not the only cue.
 */
export function ChartSeriesLegend({ items }: { items: ChartSeriesLegendItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-700">
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <span className={`shrink-0 rounded-sm ${item.swatchClassName}`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Real text for the numbers a chart draws. Collapsed so the graphic stays the visual. */
export function ChartTextAlternative({ model }: { model: ChartTextAlternativeModel }) {
  if (model.rows.length === 0) {
    return null;
  }

  return (
    <details className="text-sm text-zinc-800">
      <summary className="cursor-pointer rounded-sm font-medium text-zinc-700">
        Chart numbers: {model.caption}
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{model.caption}</caption>
          <thead>
            <tr className="bg-zinc-50 text-xs font-medium text-zinc-600">
              {model.columns.map((column) => (
                <th key={column.key} scope="col" className="sticky top-0 bg-zinc-50 px-2 py-1.5">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.key} className="border-t border-zinc-200">
                {model.columns.map((column, index) =>
                  index === 0 ? (
                    <th
                      key={column.key}
                      scope="row"
                      className="px-2 py-1.5 text-left font-normal text-zinc-800"
                    >
                      {row.cells[column.key]}
                    </th>
                  ) : (
                    <td key={column.key} className="px-2 py-1.5 tabular-nums text-zinc-800">
                      {row.cells[column.key]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
