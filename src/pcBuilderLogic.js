export const HARDWARE_ITEMS = [
  { id: 'cpu', name: 'Intel Core i9', type: 'CPU' },
  { id: 'ram', name: 'DDR5 32GB', type: 'RAM' },
  { id: 'ssd', name: 'NVMe SSD 2TB', type: 'SSD' },
  { id: 'gpu', name: 'RTX 4090', type: 'GPU' },
  { id: 'psu', name: '1000W PSU', type: 'PSU' },
  { id: 'cooler', name: '液冷散热器', type: 'COOLER', dependsOn: 'cpu' }
];

export const SLOTS = [
  { id: 'socket', accept: 'CPU', label: 'LGA1700 Socket' },
  { id: 'dimm_1', accept: 'RAM', label: 'DIMM Slot' },
  { id: 'm2_slot', accept: 'SSD', label: 'M.2 Slot' },
  { id: 'pcie_x16', accept: 'GPU', label: 'PCIe x16' },
  { id: 'atx_power', accept: 'PSU', label: '24-Pin Power' },
  { id: 'fan_mount', accept: 'COOLER', label: 'CPU Fan Mount', isOverlay: true }
];

export const REQUIRED_TYPES = ['CPU', 'RAM', 'PSU', 'COOLER'];

const hardwareById = Object.fromEntries(HARDWARE_ITEMS.map((item) => [item.id, item]));
const slotsById = Object.fromEntries(SLOTS.map((slot) => [slot.id, slot]));

export function validateInstall(installed, slotId, hardwareId) {
  const slot = slotsById[slotId];
  const hardware = hardwareById[hardwareId];

  if (!slot) {
    return { ok: false, reason: 'invalid_slot', message: '无法识别的插槽。' };
  }

  if (!hardware) {
    return { ok: false, reason: 'invalid_hardware', message: '无法识别的硬件。' };
  }

  if (installed[slotId]) {
    return {
      ok: false,
      reason: 'slot_occupied',
      message: `${slot.label} 已经安装 ${installed[slotId].name}。`
    };
  }

  if (hardware.type !== slot.accept) {
    return {
      ok: false,
      reason: 'type_mismatch',
      message: `${hardware.name} 不是 ${slot.label} 的兼容类型。`
    };
  }

  if (hardware.dependsOn) {
    const dependencyMet = Object.values(installed).some((item) => item.id === hardware.dependsOn);
    if (!dependencyMet) {
      const dependencyName = hardwareById[hardware.dependsOn]?.name ?? hardware.dependsOn;
      return {
        ok: false,
        reason: 'dependency_missing',
        message: `${hardware.name} 需要先安装 ${dependencyName}。`
      };
    }
  }

  return { ok: true, reason: 'ok', message: `${hardware.name} 可以安装到 ${slot.label}。` };
}

export function installHardware(installed, slotId, hardwareId) {
  const validation = validateInstall(installed, slotId, hardwareId);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  return { ...installed, [slotId]: hardwareById[hardwareId] };
}

export function validateRemoval(installed, slotId, systemStatus = 'OFF') {
  const slotItem = installed[slotId];
  if (!slotItem) {
    return { ok: false, reason: 'slot_empty', message: '该插槽没有已安装的硬件。' };
  }

  if (systemStatus !== 'OFF') {
    return { ok: false, reason: 'system_active', message: '请先关闭电源再拆卸硬件。' };
  }

  const dependentEntry = Object.entries(installed).find(([, item]) => item.dependsOn === slotItem.id);
  if (dependentEntry) {
    const [, dependentItem] = dependentEntry;
    return {
      ok: false,
      reason: 'dependency_blocked',
      message: `必须先拆除 ${dependentItem.name}。`
    };
  }

  return { ok: true, reason: 'ok', message: `${slotItem.name} 可以安全拆卸。` };
}

export function removeHardware(installed, slotId, systemStatus = 'OFF') {
  const validation = validateRemoval(installed, slotId, systemStatus);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  const nextState = { ...installed };
  delete nextState[slotId];
  return nextState;
}

export function getMissingRequiredTypes(installed, requiredTypes = REQUIRED_TYPES) {
  const installedTypes = new Set(Object.values(installed).map((item) => item.type));
  return requiredTypes.filter((type) => !installedTypes.has(type));
}

export function calculateProgress(installed) {
  if (!HARDWARE_ITEMS.length) return 0;
  return (Object.keys(installed).length / HARDWARE_ITEMS.length) * 100;
}
