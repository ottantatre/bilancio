import type { ColumnConfig } from './types'

/**
 * Calculate which columns should be visible based on available width
 * @param columns - All column configurations
 * @param availableWidth - Container width in pixels
 * @param buffer - Safety buffer in pixels (default 40px for scrollbar)
 * @returns Array of visible column IDs
 */
export function calculateVisibleColumns(
  columns: ColumnConfig[],
  availableWidth: number,
  buffer: number = 40
): string[] {
  // Always show priority 0 columns
  const alwaysVisible = columns.filter(col => col.priority === 0)

  // Group other columns by priority (1, 2, 3, etc.)
  const priorityGroups = new Map<number, ColumnConfig[]>()
  columns
    .filter(col => col.priority > 0)
    .forEach(col => {
      if (!priorityGroups.has(col.priority)) {
        priorityGroups.set(col.priority, [])
      }
      priorityGroups.get(col.priority)!.push(col)
    })

  // Calculate width for a column
  const getColumnWidth = (col: ColumnConfig): number => {
    if (col.width) {
      const px = parseInt(col.width)
      return isNaN(px) ? 150 : px // fallback for % widths
    }
    return 150 // default column width
  }

  // Start with always visible columns
  let visible = [...alwaysVisible]
  let totalWidth = alwaysVisible.reduce((sum, col) => sum + getColumnWidth(col), 0)

  // Add columns by priority (lowest priority number first)
  const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => a - b)

  for (const priority of sortedPriorities) {
    const cols = priorityGroups.get(priority)!

    for (const col of cols) {
      const colWidth = getColumnWidth(col)

      if (totalWidth + colWidth <= availableWidth - buffer) {
        visible.push(col)
        totalWidth += colWidth
      } else {
        // No more space, stop adding columns
        return visible.map(c => c.id)
      }
    }
  }

  return visible.map(c => c.id)
}
