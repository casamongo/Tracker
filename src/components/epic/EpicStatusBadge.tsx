import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";

interface Props {
  status: string;
}

export function EpicStatusBadge({ status }: Props) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${getStatusColor(status)}`}
    >
      {status}
    </Badge>
  );
}
