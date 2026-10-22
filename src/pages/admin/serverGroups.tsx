import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, Dialog, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Loading from "@/components/loading";
import {
  ServerGroupsProvider,
  createServerGroup,
  removeServerGroup,
  renameServerGroup,
  saveServerGroupOrder,
  type ServerGroup,
  useServerGroups,
} from "@/contexts/ServerGroupsContext";

function GroupNameDialog({ group }: { group?: ServerGroup }) {
  const { t } = useTranslation();
  const { refresh } = useServerGroups();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(group?.name ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setName(group?.name ?? "");
  }, [group?.name, open]);

  const save = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.error(t("serverGroups.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      if (group) {
        await renameServerGroup(group.id, normalizedName);
        toast.success(t("serverGroups.renameSuccess"));
      } else {
        await createServerGroup(normalizedName);
        toast.success(t("serverGroups.createSuccess"));
      }
      await refresh();
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
        {group ? (
          <IconButton variant="ghost" title={t("serverGroups.rename")}>
            <Pencil size={17} />
          </IconButton>
        ) : (
          <Button>
            <Plus size={17} />
            {t("serverGroups.add")}
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>
          {group ? t("serverGroups.rename") : t("serverGroups.add")}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("serverGroups.nameDescription")}
        </Dialog.Description>
        <TextField.Root
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("serverGroups.namePlaceholder")}
          maxLength={100}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
          }}
        />
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {t("admin.nodeTable.cancel")}
            </Button>
          </Dialog.Close>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? t("admin.nodeEdit.waiting") : t("save")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function DeleteGroupDialog({ group }: { group: ServerGroup }) {
  const { t } = useTranslation();
  const { refresh } = useServerGroups();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      await removeServerGroup(group.id);
      await refresh();
      setOpen(false);
      toast.success(t("serverGroups.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="red" title={t("delete")}>
          <Trash2 size={17} />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{t("serverGroups.deleteTitle")}</Dialog.Title>
        <Dialog.Description size="2">
          {t("serverGroups.deleteDescription", {
            name: group.name,
            count: group.client_count,
          })}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {t("admin.nodeTable.cancel")}
            </Button>
          </Dialog.Close>
          <Button color="red" disabled={deleting} onClick={() => void remove()}>
            {deleting ? t("admin.nodeTable.deleting") : t("delete")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function SortableGroup({ group }: { group: ServerGroup }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-16 items-center gap-3 rounded-lg border border-[var(--accent-5)] bg-[var(--accent-1)] px-3 py-2 shadow-sm transition-shadow ${
        isDragging ? "relative z-10 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-[var(--gray-9)] hover:bg-[var(--accent-3)] active:cursor-grabbing"
        aria-label={t("serverGroups.dragToReorder")}
        title={t("serverGroups.dragToReorder")}
      >
        <GripVertical size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <Text as="div" weight="medium" className="truncate">
          {group.name}
        </Text>
        <Text as="div" size="1" color="gray" mt="1">
          {t("serverGroups.serverCount", { count: group.client_count })}
        </Text>
      </div>
      <Badge color={group.client_count > 0 ? undefined : "gray"} variant="soft">
        {group.client_count}
      </Badge>
      <Flex gap="1" className="shrink-0">
        <GroupNameDialog group={group} />
        <DeleteGroupDialog group={group} />
      </Flex>
    </div>
  );
}

function ServerGroupsContent() {
  const { t } = useTranslation();
  const { groups, loading, error, setGroups, refresh } = useServerGroups();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((group) => group.id === active.id);
    const newIndex = groups.findIndex((group) => group.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = groups;
    const reordered = arrayMove(groups, oldIndex, newIndex).map((group, index) => ({
      ...group,
      weight: index,
    }));
    setGroups(reordered);
    try {
      await saveServerGroupOrder(reordered);
      toast.success(t("serverGroups.orderSuccess"));
    } catch (error) {
      setGroups(previous);
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  if (loading) return <Loading text="" />;

  return (
    <Flex direction="column" gap="4" p="4">
      <Flex justify="between" align="start" gap="4" wrap="wrap">
        <div>
          <Text as="div" size="5" weight="bold">
            {t("serverGroups.title")}
          </Text>
          <Text as="div" size="2" color="gray" mt="1">
            {t("serverGroups.description")}
          </Text>
        </div>
        <GroupNameDialog />
      </Flex>

      {error && (
        <Flex
          justify="between"
          align="center"
          gap="3"
          className="rounded-lg border border-[var(--red-6)] bg-[var(--red-2)] p-3"
        >
          <Text size="2" color="red">
            {error}
          </Text>
          <Button variant="soft" color="red" onClick={() => void refresh()}>
            {t("serverGroups.retry")}
          </Button>
        </Flex>
      )}

      {groups.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <SortableContext
            items={groups.map((group) => group.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex max-w-3xl flex-col gap-2">
              {groups.map((group) => (
                <SortableGroup key={group.id} group={group} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        !error && (
          <div className="flex min-h-48 max-w-3xl flex-col items-center justify-center rounded-lg border border-dashed border-[var(--accent-6)] p-8 text-center">
            <Text weight="medium">{t("serverGroups.emptyTitle")}</Text>
            <Text size="2" color="gray" mt="1">
              {t("serverGroups.emptyDescription")}
            </Text>
          </div>
        )
      )}
    </Flex>
  );
}

export default function ServerGroupsPage() {
  return (
    <ServerGroupsProvider>
      <ServerGroupsContent />
    </ServerGroupsProvider>
  );
}
