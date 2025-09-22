import type { MassCategory } from '../types';

export type MassCategoryListProps = {
  categories: MassCategory[];
  onSelect: (category: MassCategory) => void;
  formatCurrency: (amount: number) => string;
};

export function MassCategoryList({ categories, onSelect, formatCurrency }: MassCategoryListProps) {
  return (
    <>
      <div className="panel-header">Spending Targets &amp; Reforms</div>
      {categories.map((category, index) => (
        <div key={category.id ?? index} className="spending-category" onClick={() => onSelect(category)}>
          <div className="category-header">
            <div className="category-name">{category.name}</div>
            <div className="category-amount">{formatCurrency(category.amount)}</div>
          </div>
          <div className="category-controls">
            <div className="control-button">Set Target</div>
            <div className="control-button">View Reforms</div>
          </div>
        </div>
      ))}
    </>
  );
}
