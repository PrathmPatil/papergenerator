import { LoadingPanel } from "@/components/loading";
import { FileText } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading papers..." icon={FileText} />;
}
