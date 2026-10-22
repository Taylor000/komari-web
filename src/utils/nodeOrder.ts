import type { NodeBasicInfo } from "@/contexts/NodeListContext";

const normalizedGroupName = (node: NodeBasicInfo) => node.group?.trim() || "";

const groupKind = (node: NodeBasicInfo) => {
  if (!normalizedGroupName(node)) return 2;
  return typeof node.group_order === "number" ? 0 : 1;
};

/**
 * Mirrors the order configured in the admin panel:
 * managed group order, then node weight within each group. Legacy groups and
 * ungrouped nodes are kept after managed groups for backwards compatibility.
 */
export function compareNodesByAdminOrder(
  left: NodeBasicInfo,
  right: NodeBasicInfo,
) {
  const leftKind = groupKind(left);
  const rightKind = groupKind(right);
  if (leftKind !== rightKind) return leftKind - rightKind;

  const leftGroup = normalizedGroupName(left);
  const rightGroup = normalizedGroupName(right);
  if (leftKind === 0) {
    const groupOrder = (left.group_order ?? 0) - (right.group_order ?? 0);
    if (groupOrder !== 0) return groupOrder;
  } else if (leftKind === 1) {
    const groupNameOrder = leftGroup.localeCompare(rightGroup);
    if (groupNameOrder !== 0) return groupNameOrder;
  }

  const weightOrder = (left.weight ?? 0) - (right.weight ?? 0);
  if (weightOrder !== 0) return weightOrder;

  const createdOrder = (left.created_at || "").localeCompare(
    right.created_at || "",
  );
  if (createdOrder !== 0) return createdOrder;
  return left.uuid.localeCompare(right.uuid);
}
