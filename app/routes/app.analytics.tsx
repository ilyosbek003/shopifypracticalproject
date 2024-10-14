import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { PolarisVizLineChart } from "app/components/PolarisVizLineChart";
import { useEffect, useState } from "react";
import { useLoaderData, useSubmit } from "@remix-run/react";
import dayjs from "dayjs";
import DateRangePicker from "app/components/DateRangePicker";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  const { admin } = await authenticate.admin(request);

  const query = `
    {
    orders(first: 10, query: "created_at:>=${since} AND created_at:<=${until}") {
      nodes {
        id
        createdAt
        totalPriceSet {
          presentmentMoney {
            amount
          }
        }
      }
    }
  }
  `;

  const response = await admin.graphql(query);
  const responseJson = await response.json();
  return json(responseJson.data.orders.nodes);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  return json({});
};

export default function AnalyticsPage() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const [dateRange, setDateRange] = useState({
    title: "Today",
    alias: "today",
    period: {
      since: today,
      until: today,
    },
  });
  const [isClientRendering, setIsClientRendering] = useState(false);

  const analytics: {
    createdAt: string;
    totalPriceSet: {
      presentmentMoney: {
        amount: string;
      };
    };
  }[] = useLoaderData();
  const submit = useSubmit();

  const polarisData = [
    {
      name: "Current",
      data: analytics.map((analytic) => ({
        key: dayjs(analytic.createdAt).format("MMMM D, YYYY h:mm A"),
        value: analytic.totalPriceSet.presentmentMoney.amount,
      })),
    },
  ];
  useEffect(() => {
    const formData = new FormData();
    formData.set("since", dateRange.period.since.toISOString());
    formData.set("until", dateRange.period.until.toISOString());

    submit(formData, { method: "get" });
  }, [dateRange, submit]);

  useEffect(() => {
    setIsClientRendering(true);
  }, []);

  return isClientRendering ? (
    <Page>
      <TitleBar title="Analytics" />
      <div style={{ marginBottom: "40px" }}>
        <DateRangePicker setDateRange={setDateRange} />
      </div>
      <PolarisVizLineChart data={polarisData} />
    </Page>
  ) : null;
}
