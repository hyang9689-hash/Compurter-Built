import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HARDWARE_ITEMS,
  calculateProgress,
  getMissingRequiredTypes,
  installHardware,
  removeHardware,
  validateInstall,
  validateRemoval
} from '../src/pcBuilderLogic.js';

test('validateInstall blocks drop on occupied slot before applying changes', () => {
  const installed = { socket: HARDWARE_ITEMS.find((item) => item.id === 'cpu') };
  const result = validateInstall(installed, 'socket', 'cpu');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'slot_occupied');
  assert.match(result.message, /已经安装/);
});

test('installHardware enforces dependency chain for cooler', () => {
  const installed = { socket: HARDWARE_ITEMS.find((item) => item.id === 'cpu') };
  const nextState = installHardware(installed, 'fan_mount', 'cooler');

  assert.equal(nextState.fan_mount.id, 'cooler');
  assert.deepEqual(Object.keys(nextState).sort(), ['fan_mount', 'socket']);
});

test('validateRemoval refuses to remove hardware while powered on', () => {
  const installed = { socket: HARDWARE_ITEMS.find((item) => item.id === 'cpu') };
  const result = validateRemoval(installed, 'socket', 'ON');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'system_active');
  assert.match(result.message, /关闭电源/);
});

test('removeHardware blocks removing a dependency parent first', () => {
  const cpu = HARDWARE_ITEMS.find((item) => item.id === 'cpu');
  const cooler = HARDWARE_ITEMS.find((item) => item.id === 'cooler');
  const installed = { socket: cpu, fan_mount: cooler };

  assert.throws(() => removeHardware(installed, 'socket', 'OFF'), /必须先拆除/);
});

test('getMissingRequiredTypes reports missing pieces and progress matches installed count', () => {
  const installed = { socket: HARDWARE_ITEMS.find((item) => item.id === 'cpu') };

  assert.deepEqual(getMissingRequiredTypes(installed), ['RAM', 'PSU', 'COOLER']);
  assert.equal(Math.round(calculateProgress(installed)), Math.round((1 / HARDWARE_ITEMS.length) * 100));
});
