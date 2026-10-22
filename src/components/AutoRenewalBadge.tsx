import { Badge } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";

export default function AutoRenewalBadge({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();

  if (!enabled) return null;

  return (
    <Badge
      color="green"
      size="1"
      variant="soft"
      className="text-xs shrink-0 whitespace-nowrap"
    >
      {t("common.auto_renewal")}
    </Badge>
  );
}
