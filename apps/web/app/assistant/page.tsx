import type { Metadata } from "next";
import { AssistantView } from "@/components/assistant-view";

export const metadata: Metadata = {
  title: "Trợ lý di sản · Heritage Guide"
};

export default function AssistantPage() {
  return <AssistantView />;
}
