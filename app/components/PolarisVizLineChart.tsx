import { LineChart } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";

export const PolarisVizLineChart = ({ data }) => {
  return (
    <div
      style={{
        height: 400,
      }}
    >
      <LineChart data={data} theme="Light" />
    </div>
  );
};
