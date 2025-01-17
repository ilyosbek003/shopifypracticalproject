import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { PolarisVizProvider } from "@shopify/polaris-viz";
import "@shopify/polaris-viz/build/esm/styles.css";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <PolarisVizProvider
        themes={{
          Light: {
            legend: {
              backgroundColor: "white",
            },
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/orders">Orders</Link>
          <Link to="/app/modifyproductdesc">Modify product description</Link>
          <Link to="/app/inventory">Inventory</Link>
          <Link to="/app/analytics">Analytics</Link>
        </NavMenu>
        <Outlet />
      </PolarisVizProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
