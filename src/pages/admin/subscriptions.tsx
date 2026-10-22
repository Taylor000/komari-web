import * as React from "react";
import {
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  Switch,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  CalendarClock,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Loading from "@/components/loading";
import {
  createSubscription,
  deleteSubscription,
  fetchAdminSubscriptions,
  updateSubscription,
} from "@/lib/subscriptions";
import type { Subscription, SubscriptionInput } from "@/types/Subscription";
import {
  formatBillingCycle,
  formatSubscriptionDate,
  getRemainingDays,
} from "@/components/SubscriptionDisplay";
import "./subscriptions.css";

const toDateInput = (value: string | Date) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createEmptyInput = (): SubscriptionInput => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return {
    name: "",
    plan: "",
    price: 0,
    currency: "¥",
    billing_cycle: 30,
    expires_at: toDateInput(expiresAt),
    auto_renewal: true,
    visible: true,
    show_price: true,
    url: "",
    remark: "",
  };
};

const toInput = (item: Subscription): SubscriptionInput => ({
  name: item.name,
  plan: item.plan || "",
  price: item.price ?? 0,
  currency: item.currency,
  billing_cycle: item.billing_cycle,
  expires_at: toDateInput(item.expires_at),
  auto_renewal: item.auto_renewal,
  visible: item.visible ?? true,
  show_price: item.show_price,
  url: item.url || "",
  remark: item.remark || "",
});

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text as="label" size="2" weight="medium" className="subscription-form-label">
      {children}
      {required && <span aria-hidden="true"> *</span>}
    </Text>
  );
}

function SubscriptionDialog({
  item,
  onSaved,
}: {
  item?: Subscription;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<SubscriptionInput>(() =>
    item ? toInput(item) : createEmptyInput(),
  );

  React.useEffect(() => {
    if (open) setForm(item ? toInput(item) : createEmptyInput());
  }, [item, open]);

  const set = <K extends keyof SubscriptionInput>(key: K, value: SubscriptionInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t("subscriptions.validation.nameRequired"));
      return;
    }
    if (!form.expires_at) {
      toast.error(t("subscriptions.validation.dateRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        plan: form.plan.trim(),
        currency: form.currency.trim() || "¥",
        url: form.url.trim(),
        remark: form.remark.trim(),
      };
      if (item) {
        await updateSubscription(item.id, payload);
        toast.success(t("subscriptions.updateSuccess"));
      } else {
        await createSubscription(payload);
        toast.success(t("subscriptions.createSuccess"));
      }
      await onSaved();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        {item ? (
          <IconButton variant="ghost" title={t("subscriptions.edit")}>
            <Pencil size={17} />
          </IconButton>
        ) : (
          <Button>
            <Plus size={17} />
            {t("subscriptions.add")}
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Content maxWidth="620px" className="subscription-dialog-content">
        <Dialog.Title>
          {item ? t("subscriptions.editTitle") : t("subscriptions.addTitle")}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("subscriptions.formDescription")}
        </Dialog.Description>

        <div className="subscription-form-grid">
          <div className="subscription-form-field">
            <FieldLabel required>{t("subscriptions.name")}</FieldLabel>
            <TextField.Root
              value={form.name}
              maxLength={100}
              autoFocus
              placeholder={t("subscriptions.namePlaceholder")}
              onChange={(event) => set("name", event.target.value)}
            />
          </div>
          <div className="subscription-form-field">
            <FieldLabel>{t("subscriptions.plan")}</FieldLabel>
            <TextField.Root
              value={form.plan}
              maxLength={100}
              placeholder={t("subscriptions.planPlaceholder")}
              onChange={(event) => set("plan", event.target.value)}
            />
          </div>

          <div className="subscription-form-field subscription-price-field">
            <FieldLabel required>{t("subscriptions.cost")}</FieldLabel>
            <div className="subscription-price-inputs">
              <TextField.Root
                className="subscription-currency-input"
                value={form.currency}
                maxLength={8}
                aria-label={t("subscriptions.currency")}
                onChange={(event) => set("currency", event.target.value)}
              />
              <TextField.Root
                type="number"
                min="0"
                step="0.01"
                value={String(form.price)}
                onChange={(event) => set("price", Number(event.target.value))}
              />
            </div>
          </div>
          <div className="subscription-form-field">
            <FieldLabel required>{t("subscriptions.billingCycle")}</FieldLabel>
            <Select.Root
              value={String(form.billing_cycle)}
              onValueChange={(value) => set("billing_cycle", Number(value))}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="7">{t("subscriptions.cycle.weekly")}</Select.Item>
                <Select.Item value="30">{t("subscriptions.cycle.monthly")}</Select.Item>
                <Select.Item value="90">{t("subscriptions.cycle.quarterly")}</Select.Item>
                <Select.Item value="180">{t("subscriptions.cycle.semiAnnual")}</Select.Item>
                <Select.Item value="365">{t("subscriptions.cycle.annual")}</Select.Item>
                <Select.Item value="-1">{t("subscriptions.cycle.once")}</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <div className="subscription-form-field">
            <FieldLabel required>{t("subscriptions.expiresAt")}</FieldLabel>
            <TextField.Root
              type="date"
              value={form.expires_at}
              onChange={(event) => set("expires_at", event.target.value)}
            />
          </div>
          <div className="subscription-form-field">
            <FieldLabel>{t("subscriptions.url")}</FieldLabel>
            <TextField.Root
              type="url"
              value={form.url}
              maxLength={500}
              placeholder="https://"
              onChange={(event) => set("url", event.target.value)}
            />
          </div>

          <div className="subscription-form-field subscription-form-full">
            <FieldLabel>{t("subscriptions.remark")}</FieldLabel>
            <TextArea
              value={form.remark}
              maxLength={500}
              resize="vertical"
              placeholder={t("subscriptions.remarkPlaceholder")}
              onChange={(event) => set("remark", event.target.value)}
            />
          </div>
        </div>

        <div className="subscription-switch-list">
          <label className="subscription-switch-row">
            <div>
              <Text as="div" size="2" weight="medium">{t("subscriptions.autoRenewal")}</Text>
              <Text as="div" size="1" color="gray">{t("subscriptions.autoRenewalHelp")}</Text>
            </div>
            <Switch checked={form.auto_renewal} onCheckedChange={(checked) => set("auto_renewal", checked)} />
          </label>
          <label className="subscription-switch-row">
            <div>
              <Text as="div" size="2" weight="medium">{t("subscriptions.visible")}</Text>
              <Text as="div" size="1" color="gray">{t("subscriptions.visibleHelp")}</Text>
            </div>
            <Switch checked={form.visible} onCheckedChange={(checked) => set("visible", checked)} />
          </label>
          <label className="subscription-switch-row">
            <div>
              <Text as="div" size="2" weight="medium">{t("subscriptions.showPrice")}</Text>
              <Text as="div" size="1" color="gray">{t("subscriptions.showPriceHelp")}</Text>
            </div>
            <Switch
              checked={form.show_price}
              disabled={!form.visible}
              onCheckedChange={(checked) => set("show_price", checked)}
            />
          </label>
        </div>

        <Flex justify="end" gap="2" mt="5">
          <Dialog.Close>
            <Button variant="soft" color="gray">{t("subscriptions.cancel")}</Button>
          </Dialog.Close>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? t("subscriptions.saving") : t("subscriptions.save")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DeleteDialog({ item, onDeleted }: { item: Subscription; onDeleted: () => Promise<void> }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteSubscription(item.id);
      await onDeleted();
      setOpen(false);
      toast.success(t("subscriptions.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="red" title={t("subscriptions.delete")}>
          <Trash2 size={17} />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{t("subscriptions.deleteTitle")}</Dialog.Title>
        <Dialog.Description>
          {t("subscriptions.deleteDescription", { name: item.name })}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">{t("subscriptions.cancel")}</Button>
          </Dialog.Close>
          <Button color="red" disabled={deleting} onClick={() => void remove()}>
            {deleting ? t("subscriptions.deleting") : t("subscriptions.delete")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function AdminSubscriptionCard({ item, refresh }: { item: Subscription; refresh: () => Promise<void> }) {
  const { t } = useTranslation();
  const days = getRemainingDays(item.expires_at);
  const color = days < 0 ? "red" : days <= 7 ? "orange" : "green";
  return (
    <div className="admin-subscription-card">
      <div className="admin-subscription-icon" aria-hidden="true"><ReceiptText size={20} /></div>
      <div className="admin-subscription-main">
        <Flex align="center" gap="2" wrap="wrap">
          <Text weight="bold" truncate>{item.name}</Text>
          <Badge color={color} variant="soft" radius="full">
            {days < 0 ? t("subscriptions.status.expired") : days <= 7 ? t("subscriptions.status.dueSoon") : t("subscriptions.status.active")}
          </Badge>
          <Badge color={item.visible ? undefined : "gray"} variant="soft" radius="full">
            {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            {item.visible ? t("subscriptions.public") : t("subscriptions.private")}
          </Badge>
        </Flex>
        <Text as="div" size="2" color="gray" mt="1" truncate>
          {item.plan || t("subscriptions.defaultPlan")} · {item.currency}{item.price?.toLocaleString("zh-CN")} / {formatBillingCycle(item.billing_cycle, t)}
        </Text>
        <Flex gap="3" mt="2" wrap="wrap" className="admin-subscription-meta">
          <span><CalendarClock size={14} />{t("subscriptions.expiresAt")} {formatSubscriptionDate(item.expires_at)}</span>
          <span>{item.auto_renewal ? t("subscriptions.autoRenewal") : t("subscriptions.manualRenewal")}</span>
          {!item.show_price && <span>{t("subscriptions.priceHidden")}</span>}
        </Flex>
      </div>
      <Flex gap="1" className="admin-subscription-actions">
        <SubscriptionDialog item={item} onSaved={refresh} />
        <DeleteDialog item={item} onDeleted={refresh} />
      </Flex>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [items, setItems] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchAdminSubscriptions());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  if (loading) return <Loading text="" />;

  return (
    <Flex direction="column" gap="4" p="4">
      <Flex justify="between" align="start" gap="4" wrap="wrap">
        <div>
          <Text as="div" size="5" weight="bold">{t("subscriptions.manageTitle")}</Text>
          <Text as="div" size="2" color="gray" mt="1">{t("subscriptions.manageDescription")}</Text>
        </div>
        <SubscriptionDialog onSaved={refresh} />
      </Flex>

      {error && (
        <Flex justify="between" align="center" gap="3" className="subscription-error">
          <Text size="2" color="red">{error}</Text>
          <Button variant="soft" color="red" onClick={() => void refresh()}>{t("subscriptions.retry")}</Button>
        </Flex>
      )}

      {items.length > 0 ? (
        <div className="admin-subscription-list">
          {items.map((item) => <AdminSubscriptionCard key={item.id} item={item} refresh={refresh} />)}
        </div>
      ) : !error ? (
        <div className="admin-subscription-empty">
          <span className="admin-subscription-empty-icon"><ReceiptText size={26} /></span>
          <Text weight="medium">{t("subscriptions.emptyTitle")}</Text>
          <Text size="2" color="gray">{t("subscriptions.emptyDescription")}</Text>
        </div>
      ) : null}
    </Flex>
  );
}
