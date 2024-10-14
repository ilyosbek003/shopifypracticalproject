import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Button,
  Modal,
  Card,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

const stripHtmlTags = (html: string) => {
  return html.replace(/<[^>]+>/g, "");
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        products(first: 10) {
          edges {
            node {
              id
              title
              descriptionHtml
            }
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const products = responseJson.data!.products.edges.map(
    (edge: any) => edge.node,
  );
  return json({ products });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const newTitle = formData.get("newTitle");
  const newDescription = formData.get("newDescription");

  const response = await admin.graphql(
    `#graphql
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
          }
        }
      }`,
    {
      variables: {
        input: {
          id: productId,
          title: newTitle,
          descriptionHtml: newDescription,
        },
      },
    },
  );

  const responseJson = await response.json();
  return json({ updatedProduct: responseJson.data!.productUpdate.product });
};

export default function ModifyProductDescriptionPage() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleModalOpen = (product: any) => {
    setSelectedProduct(product);
    setNewTitle(product.title);
    setNewDescription(stripHtmlTags(product.descriptionHtml) || "");
  };

  const handleModalClose = () => setSelectedProduct(null);

  const handleSubmit = () => {
    fetcher.submit(
      { productId: selectedProduct.id, newTitle, newDescription },
      { method: "post" },
    );
    handleModalClose();
  };

  return (
    <Page>
      <TitleBar title="Modify Product Title and Description" />
      <Layout>
        <Layout.Section>
          {products.map((product: any) => (
            <Card key={product.id}>
              <Text as="h4" variant="headingMd">
                {product.title}
              </Text>
              <Text as="h6" variant="bodyMd">
                {stripHtmlTags(product.descriptionHtml) || "No description"}
              </Text>
              <Button onClick={() => handleModalOpen(product)}>Edit</Button>
            </Card>
          ))}
        </Layout.Section>
      </Layout>

      {selectedProduct && (
        <Modal
          open={Boolean(selectedProduct)}
          onClose={handleModalClose}
          title="Edit Product"
          primaryAction={{
            content: "Submit",
            onAction: handleSubmit,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: handleModalClose,
            },
          ]}
        >
          <Modal.Section>
            <TextField
              label="Product Title"
              value={newTitle}
              autoComplete="off"
              onChange={(value) => setNewTitle(value)}
            />
            <TextField
              label="Product Description"
              multiline={4}
              autoComplete="off"
              value={newDescription}
              onChange={(value) => setNewDescription(value)}
            />
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
