import type { ProductSeries } from '../../types';

interface Props {
  value: ProductSeries;
  disabled: boolean;
  onChange: (series: ProductSeries) => void;
}

export function ProductSeriesSelect({ value, disabled, onChange }: Props) {
  return (
    <div className="panel">
      <label htmlFor="product-series">Product Series</label>
      <select id="product-series" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as ProductSeries)}>
        <option value="wifi">WISE-4000/4200 (Wi-Fi)</option>
        <option value="nbiot">WISE-4671/4471 (NB-IoT)</option>
        <option value="lora">LoRa (WISE-4610/WISE-2200-M)</option>
        <option value="lan">WISE-4000/LAN</option>
      </select>
    </div>
  );
}
