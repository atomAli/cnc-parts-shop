"use client";

import { useParams } from "next/navigation";
import ProductEditPage from "../ProductForm";

export default function EditProductPage() {
  const { id } = useParams();
  return <ProductEditPage productId={id as string} />;
}
