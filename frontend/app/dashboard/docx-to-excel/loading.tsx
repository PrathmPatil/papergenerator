import { LoadingPanel } from "@/components/loading";
import { FileSpreadsheet } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading DOCX converter..." icon={FileSpreadsheet} />;
}
