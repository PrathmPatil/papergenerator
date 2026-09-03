import { LoadingPanel } from "@/components/loading";
import { FileType } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading PDF converter..." icon={FileType} />;
}
