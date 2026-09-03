import { LoadingPanel } from "@/components/loading";
import { HelpCircle } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading questions..." icon={HelpCircle} />;
}
