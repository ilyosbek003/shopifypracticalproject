import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Card,
  ChoiceList,
  IndexFilters,
  IndexTable,
  Page,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import type {
  AppliedFilterInterface,
  SortButtonChoice,
  TabProps,
} from "@shopify/polaris";
import type { IndexFiltersPrimaryAction } from "@shopify/polaris/build/ts/src/components/IndexFilters";
import { authenticate } from "app/shopify.server";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
  query {
    orders(first: 10) {
      nodes {
        id
        name
        createdAt
        customer {
          firstName
        }
        channelInformation {
        	app {
            title
          }
      	}
        totalPriceSet {
          presentmentMoney {
            amount
          }
        }
        displayFulfillmentStatus
        displayFinancialStatus
      }
    }
  }`,
  );

  const responseJson = await response.json();
  return json(responseJson.data.orders.nodes);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const orderInput = {
    customerId: "cus_123456",
    items: [
      {
        productId: "prod_123456",
        quantity: 1,
        price: "100.00",
      },
    ],
  };

  const response = await admin.graphql(
    `#graphql
      mutation createOrder($input: OrderInput!) {
        orderCreate(input: $input) {
          order {
            id
          }
        }
      }`,
    {
      variables: {
        input: orderInput,
      },
    },
  );

  const responseJson = await response.json();

  const order = responseJson.data.orderCreate.order;

  return json({ order });
};

export default function OrdersPage() {
  const fetcher = useFetcher<typeof action>();
  const orders: {
    id: string;
    name: string;
    createdAt: string;
    customer: {
      firstName: string;
    };
    channelInformation: {
      app: {
        title: string;
      };
    };
    totalPriceSet: {
      presentmentMoney: {
        amount: number;
      };
    };
    displayFulfillmentStatus: string;
    displayFinancialStatus: string;
  }[] = useLoaderData();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const orderId = fetcher.data?.order?.id;

  useEffect(() => {
    if (orderId) {
      shopify.toast.show("Order created successfully!");
    }
  }, [orderId, shopify]);

  const createOrder = () => {
    fetcher.submit({}, { method: "POST" });
  };

  function disambiguateLabel(key: "type" | "tone", value: string[]) {
    switch (key) {
      case "type":
        return value.map((val) => `type: ${val}`).join(", ");
      case "tone":
        return value.map((val) => `tone: ${val}`).join(", ");
      default:
        return value;
    }
  }
  function isEmpty(value: string[]) {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  }
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const [itemStrings, setItemStrings] = useState([
    "All",
    "Active",
    "Draft",
    "Archived",
  ]);
  const deleteView = (index: number) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };
  const duplicateView = async (name: string) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };
  const tabs: TabProps[] = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions:
      index === 0
        ? []
        : [
            {
              type: "rename",
              onAction: () => {},
              onPrimaryAction: async (value) => {
                const newItemsStrings = tabs.map((item, idx) => {
                  if (idx === index) {
                    return value;
                  }
                  return item.content;
                });
                await sleep(1);
                setItemStrings(newItemsStrings);
                return true;
              },
            },
            {
              type: "duplicate",
              onPrimaryAction: async (name) => {
                await sleep(1);
                duplicateView(name);
                return true;
              },
            },
            {
              type: "edit",
            },
            {
              type: "delete",
              onPrimaryAction: async () => {
                await sleep(1);
                deleteView(index);
                return true;
              },
            },
          ],
  }));
  const [selected, setSelected] = useState(0);
  const onCreateNewView = async (value: string) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };
  const sortOptions: SortButtonChoice[] = [
    { label: "Order", value: "order asc", directionLabel: "Ascending" },
    { label: "Order", value: "order desc", directionLabel: "Descending" },
    { label: "Status", value: "tone asc", directionLabel: "A-Z" },
    { label: "Status", value: "tone desc", directionLabel: "Z-A" },
    { label: "Type", value: "type asc", directionLabel: "A-Z" },
    { label: "Type", value: "type desc", directionLabel: "Z-A" },
    { label: "Vendor", value: "vendor asc", directionLabel: "Ascending" },
    { label: "Vendor", value: "vendor desc", directionLabel: "Descending" },
  ];
  const [sortSelected, setSortSelected] = useState(["product asc"]);
  const { mode, setMode } = useSetIndexFiltersMode();
  const onHandleCancel = () => {};
  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };
  const primaryAction: IndexFiltersPrimaryAction =
    selected === 0
      ? {
          type: "save-as",
          onAction: onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save",
          onAction: onHandleSave,
          disabled: false,
          loading: false,
        };
  const [tone, setStatus] = useState<string[] | undefined>(undefined);
  const [type, setType] = useState<string[] | undefined>(undefined);
  const [queryValue, setQueryValue] = useState("");
  const handleStatusChange = useCallback(
    (value: string[] | undefined) => setStatus(value),
    [],
  );
  const handleTypeChange = useCallback(
    (value: string[] | undefined) => setType(value),
    [],
  );
  const handleFiltersQueryChange = useCallback(
    (value: string) => setQueryValue(value),
    [],
  );
  const handleStatusRemove = useCallback(() => setStatus(undefined), []);
  const handleTypeRemove = useCallback(() => setType(undefined), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFiltersClearAll = useCallback(() => {
    handleStatusRemove();
    handleTypeRemove();
    handleQueryValueRemove();
  }, [handleStatusRemove, handleQueryValueRemove, handleTypeRemove]);
  const filters = [
    {
      key: "tone",
      label: "Status",
      filter: (
        <ChoiceList
          title="tone"
          titleHidden
          choices={[
            { label: "Active", value: "active" },
            { label: "Draft", value: "draft" },
            { label: "Archived", value: "archived" },
          ]}
          selected={tone || []}
          onChange={handleStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "type",
      label: "Type",
      filter: (
        <ChoiceList
          title="Type"
          titleHidden
          choices={[
            { label: "Brew Gear", value: "brew-gear" },
            { label: "Brew Merch", value: "brew-merch" },
          ]}
          selected={type || []}
          onChange={handleTypeChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];
  const appliedFilters: AppliedFilterInterface[] = [];
  if (tone && !isEmpty(tone)) {
    const key = "tone";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, tone) as string,
      onRemove: handleStatusRemove,
    });
  }
  if (type && !isEmpty(type)) {
    const key = "type";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, type) as string,
      onRemove: handleTypeRemove,
    });
  }

  const resourceName = {
    singular: "order",
    plural: "orders",
  };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(orders);
  const rowMarkup = orders.map(
    (
      {
        id,
        name,
        createdAt,
        customer,
        channelInformation,
        totalPriceSet,
        displayFulfillmentStatus,
        displayFinancialStatus,
      },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>{name}</IndexTable.Cell>
        <IndexTable.Cell>
          {dayjs(createdAt).format("dddd [at] hh:mm a")}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {customer?.firstName || "No customer"}
        </IndexTable.Cell>
        <IndexTable.Cell>{channelInformation?.app.title}</IndexTable.Cell>
        <IndexTable.Cell>
          UZS {totalPriceSet?.presentmentMoney.amount}
        </IndexTable.Cell>
        <IndexTable.Cell>{displayFinancialStatus}</IndexTable.Cell>
        <IndexTable.Cell>{displayFulfillmentStatus}</IndexTable.Cell>
        <IndexTable.Cell>{}</IndexTable.Cell>
        <IndexTable.Cell>{}</IndexTable.Cell>
        <IndexTable.Cell>shipping</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Orders"
      primaryAction={{
        content: "Create order",
        onAction: createOrder,
        disabled: isLoading,
      }}
    >
      <Card padding="0">
        <IndexFilters
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={queryValue}
          queryPlaceholder="Searching in all"
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={() => {}}
          onSort={setSortSelected}
          primaryAction={primaryAction}
          cancelAction={{
            onAction: onHandleCancel,
            disabled: false,
            loading: false,
          }}
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={onCreateNewView}
          filters={filters}
          appliedFilters={appliedFilters}
          onClearAll={handleFiltersClearAll}
          mode={mode}
          setMode={setMode}
        />
        <IndexTable
          resourceName={resourceName}
          itemCount={orders.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          sortable={[false, true, true, true, true, true, true]}
          headings={[
            { title: "Order" },
            { title: "Date" },
            { title: "Customer" },
            { title: "Channel" },
            { title: "Total" },
            { title: "Payment status" },
            { title: "Fullfillment status" },
            { title: "Items" },
            { title: "Delivery status" },
            { title: "Delivery method" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}
