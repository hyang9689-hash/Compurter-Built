import React, { useState, useEffect } from 'react';
import { Cpu, Zap, CircuitBoard, Fan, HardDrive, Monitor, CheckCircle, AlertCircle, Box, Power } from 'lucide-react';

// --- 组件定义 ---

// 硬件清单数据
const HARDWARE_ITEMS = [
  { id: 'cpu', name: 'Intel Core i9', type: 'CPU', icon: <Cpu size={24} />, description: '中央处理器，计算机的大脑' },
  { id: 'ram', name: 'DDR5 32GB', type: 'RAM', icon: <CircuitBoard size={24} />, description: '随机存取存储器，临时数据存储' },
  { id: 'ssd', name: 'NVMe SSD 2TB', type: 'SSD', icon: <HardDrive size={24} />, description: '高速固态硬盘，系统存储' },
  { id: 'gpu', name: 'RTX 4090', type: 'GPU', icon: <Monitor size={24} />, description: '图形处理器，渲染图像' },
  { id: 'psu', name: '1000W PSU', type: 'PSU', icon: <Zap size={24} />, description: '电源供应器，提供电力' },
  { id: 'cooler', name: '液冷散热器', type: 'COOLER', icon: <Fan size={24} />, description: 'CPU散热器，必须安装在CPU之上', dependsOn: 'cpu' },
];

// 槽位定义
const SLOTS = [
  { id: 'socket', accept: 'CPU', label: 'LGA1700 Socket', x: 40, y: 30, w: 20, h: 20 },
  { id: 'dimm_1', accept: 'RAM', label: 'DIMM Slot', x: 65, y: 20, w: 5, h: 35 },
  { id: 'm2_slot', accept: 'SSD', label: 'M.2 Slot', x: 40, y: 60, w: 20, h: 5 },
  { id: 'pcie_x16', accept: 'GPU', label: 'PCIe x16', x: 10, y: 70, w: 50, h: 10 },
  { id: 'atx_power', accept: 'PSU', label: '24-Pin Power', x: 85, y: 40, w: 10, h: 30 },
  // Cooler 覆盖在 CPU Socket 上，逻辑特殊处理
  { id: 'fan_mount', accept: 'COOLER', label: 'CPU Fan Mount', x: 38, y: 28, w: 24, h: 24, isOverlay: true },
];

export default function PCBuilder() {
  const [installed, setInstalled] = useState({});
  const [draggingItem, setDraggingItem] = useState(null);
  const [systemStatus, setSystemStatus] = useState('OFF'); // OFF, BOOTING, ON
  const [log, setLog] = useState(['欢迎来到装机实验室！请将左侧的硬件拖入主板。']);

  // 添加日志辅助函数
  const addLog = (message, type = 'info') => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // 开始拖拽
  const handleDragStart = (e, item) => {
    setDraggingItem(item);
    e.dataTransfer.setData('hardwareId', item.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggingItem(null);
  };

  // 允许放置
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // 处理放置逻辑
  const handleDrop = (e, slotId) => {
    e.preventDefault();
    const hardwareId = e.dataTransfer.getData('hardwareId');
    const item = HARDWARE_ITEMS.find(i => i.id === hardwareId);
    const slot = SLOTS.find(s => s.id === slotId);

    if (!item || !slot) return;

    // 1. 检查类型是否匹配
    if (item.type !== slot.accept) {
      addLog(`错误：${item.name} 无法安装在 ${slot.label} 上。`, 'error');
      return;
    }

    // 2. 检查依赖关系 (核心逻辑：硬件感知)
    if (item.dependsOn) {
      const dependency = HARDWARE_ITEMS.find(i => i.id === item.dependsOn);
      // 检查依赖项是否已经安装在任意槽位（简化逻辑，通常CPU只有一个）
      const isDependencyMet = Object.values(installed).some(inst => inst.id === item.dependsOn);
      
      if (!isDependencyMet) {
        addLog(`安装失败：${item.name} 需要先安装 ${dependency.name}。`, 'error');
        return;
      }
    }

    // 3. 安装成功
    setInstalled(prev => ({ ...prev, [slotId]: item }));
    addLog(`成功安装：${item.name} 已就位。`, 'success');
    
    // 播放简单的音效反馈 (视觉模拟)
    const slotElement = document.getElementById(`slot-${slotId}`);
    if(slotElement) {
        slotElement.classList.add('animate-ping-once');
        setTimeout(() => slotElement.classList.remove('animate-ping-once'), 500);
    }
  };

  // 移除硬件
  const handleRemove = (slotId) => {
    if (systemStatus !== 'OFF') {
      addLog("警告：请先关闭电源再拆卸硬件！", 'error');
      return;
    }
    const item = installed[slotId];
    
    // 检查是否有其他硬件依赖于此硬件 (例如拆CPU前要拆风扇)
    const dependentSlot = Object.keys(installed).find(key => {
        const instItem = installed[key];
        return instItem.dependsOn === item.id;
    });

    if (dependentSlot) {
        const dependentItem = installed[dependentSlot];
        addLog(`拆卸失败：必须先拆除 ${dependentItem.name}。`, 'error');
        return;
    }

    const newInstalled = { ...installed };
    delete newInstalled[slotId];
    setInstalled(newInstalled);
    addLog(`已拆卸：${item.name} 回到库存。`);
  };

  // 开机逻辑
  const handlePowerOn = () => {
    if (systemStatus === 'ON') {
      setSystemStatus('OFF');
      addLog("系统已关机。");
      return;
    }

    // 检查完整性
    const requiredTypes = ['CPU', 'RAM', 'PSU', 'COOLER'];
    const installedTypes = Object.values(installed).map(i => i.type);
    const missing = requiredTypes.filter(t => !installedTypes.includes(t));

    if (missing.length > 0) {
      addLog(`开机失败：缺少关键组件 [${missing.join(', ')}]`, 'error');
      return;
    }

    setSystemStatus('BOOTING');
    addLog("正在启动系统...", 'info');
    
    setTimeout(() => {
      setSystemStatus('ON');
      addLog("系统启动成功！所有硬件运行正常。", 'success');
    }, 2000);
  };

  // 计算完成度百分比
  const progress = (Object.keys(installed).length / HARDWARE_ITEMS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 flex flex-col md:flex-row gap-6">
      {/* CSS 动画注入 */}
      <style>{`
        @keyframes pulse-border {
          0% { border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { border-color: rgba(59, 130, 246, 1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s infinite;
        }
        .animate-ping-once {
          animation: ping 0.5s cubic-bezier(0, 0, 0.2, 1) 1;
        }
        @keyframes ping {
            75%, 100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      {/* 左侧：零件库 */}
      <div className="w-full md:w-1/4 bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
          <Box /> 硬件库存
        </h2>
        <div className="space-y-3 overflow-y-auto flex-1">
          {HARDWARE_ITEMS.map((item) => {
            const isInstalled = Object.values(installed).some(i => i.id === item.id);
            return (
              <div
                key={item.id}
                draggable={!isInstalled && systemStatus === 'OFF'}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 select-none
                  ${isInstalled 
                    ? 'opacity-40 border-slate-700 bg-slate-800 cursor-not-allowed' 
                    : 'bg-slate-700 border-slate-600 hover:border-cyan-500 cursor-grab active:cursor-grabbing hover:bg-slate-600 shadow-md'}
                `}
              >
                <div className={`${isInstalled ? 'text-slate-500' : 'text-cyan-400'}`}>
                  {item.icon}
                </div>
                <div>
                  <div className="font-bold text-sm">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.type}</div>
                </div>
                {isInstalled && <CheckCircle className="ml-auto text-green-500" size={16} />}
              </div>
            );
          })}
        </div>
        
        {/* 系统控制 */}
        <div className="mt-4 pt-4 border-t border-slate-700">
             <button
                onClick={handlePowerOn}
                className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all
                    ${systemStatus === 'ON' 
                        ? 'bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.5)]' 
                        : systemStatus === 'BOOTING'
                        ? 'bg-yellow-600 cursor-wait'
                        : 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.5)]'}
                `}
             >
                 <Power size={24} />
                 {systemStatus === 'ON' ? 'SYSTEM ONLINE' : systemStatus === 'BOOTING' ? 'BOOTING...' : 'POWER ON'}
             </button>
        </div>
      </div>

      {/* 中间：主板视图 */}
      <div className="flex-1 bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 relative overflow-hidden flex flex-col items-center justify-center">
        <h2 className="absolute top-4 left-4 text-xl font-bold text-slate-400 flex items-center gap-2">
            <CircuitBoard /> 主板视图 (Z790 Chipset)
        </h2>

        {/* 主板 PCB 板 */}
        <div className="relative w-[400px] h-[500px] bg-slate-900 rounded-lg border-4 border-slate-600 shadow-2xl transition-all duration-500"
             style={{
                 boxShadow: systemStatus === 'ON' ? '0 0 50px rgba(6, 182, 212, 0.3)' : 'none'
             }}
        >
            {/* PCB 纹理线条 (装饰) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-10 left-10 w-full h-[1px] bg-slate-500"></div>
                <div className="absolute top-20 left-0 w-20 h-[1px] bg-slate-500"></div>
                <div className="absolute bottom-10 right-10 w-32 h-[1px] bg-slate-500"></div>
                <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-slate-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* 渲染所有插槽 */}
            {SLOTS.map((slot) => {
                const isOccupied = installed[slot.id];
                // 高亮逻辑：如果正在拖拽的物品类型匹配此插槽，且此插槽未被占用
                const isHighlight = draggingItem && draggingItem.type === slot.accept && !isOccupied;
                // 如果是散热器，需要检查CPU是否已安装
                const isCoolerBlocked = slot.accept === 'COOLER' && draggingItem?.type === 'COOLER' && !installed['socket'];
                
                // --- 修复逻辑开始 ---
                // 如果当前槽位是覆盖层（如散热器槽），并且用户手里正拿着被覆盖层需要的硬件（如CPU）
                // 那么这个覆盖层应该 "让路" (pointer-events-none)，让用户能点到底下的槽位。
                const isOverlayBlocking = slot.isOverlay && draggingItem?.type === 'CPU';
                // --- 修复逻辑结束 ---

                // 动态样式
                let borderColor = 'border-slate-600';
                let bgColor = 'bg-slate-800/50';
                
                if (isOccupied) {
                    borderColor = systemStatus === 'ON' ? 'border-cyan-400' : 'border-green-500';
                    bgColor = 'bg-slate-700';
                } else if (isHighlight) {
                    if (isCoolerBlocked) {
                         borderColor = 'border-red-500 border-dashed';
                         bgColor = 'bg-red-900/30';
                    } else {
                        borderColor = 'border-yellow-400 animate-pulse-border';
                        bgColor = 'bg-yellow-900/30';
                    }
                }

                return (
                    <div
                        id={`slot-${slot.id}`}
                        key={slot.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, slot.id)}
                        onClick={() => isOccupied && handleRemove(slot.id)}
                        className={`absolute border-2 rounded transition-all duration-300 flex items-center justify-center text-xs text-center font-mono cursor-pointer z-10
                            ${borderColor} ${bgColor} 
                            ${isOccupied ? 'hover:bg-red-900/50 hover:border-red-500 hover:text-red-200' : ''}
                            ${isOverlayBlocking ? 'pointer-events-none' : ''} 
                        `}
                        style={{
                            left: `${slot.x}%`,
                            top: `${slot.y}%`,
                            width: `${slot.w}%`,
                            height: `${slot.h}%`,
                            zIndex: slot.isOverlay ? 20 : 10
                        }}
                        title={isOccupied ? `点击拆卸 ${isOccupied.name}` : slot.label}
                    >
                        {isOccupied ? (
                            <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-300">
                                {isOccupied.icon}
                                <span className="hidden md:block scale-75">{isOccupied.name}</span>
                            </div>
                        ) : (
                            <span className={`${isHighlight ? 'text-yellow-200' : 'text-slate-600'}`}>
                                {slot.label}
                            </span>
                        )}
                        
                        {/* 状态指示灯 (装饰) */}
                        {systemStatus === 'ON' && isOccupied && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,1)] animate-pulse"></div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* 进度条 */}
        <div className="absolute bottom-4 left-6 right-6">
            <div className="flex justify-between text-xs mb-1 text-slate-400">
                <span>组装进度</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
      </div>

      {/* 右侧：日志与反馈 */}
      <div className="w-full md:w-1/4 bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
           <AlertCircle /> 系统日志
        </h2>
        <div className="flex-1 bg-black/30 rounded-lg p-3 font-mono text-xs overflow-y-auto max-h-[500px] border border-slate-700 shadow-inner">
            {log.map((entry, i) => (
                <div key={i} className={`mb-2 pb-2 border-b border-slate-800/50 last:border-0 ${
                    entry.includes('错误') || entry.includes('失败') ? 'text-red-400' : 
                    entry.includes('成功') ? 'text-green-400' : 'text-slate-400'
                }`}>
                    {entry}
                </div>
            ))}
            {log.length === 0 && <span className="text-slate-600">等待操作...</span>}
        </div>
        
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-300">
            <h3 className="font-bold text-slate-200 mb-2">操作指南:</h3>
            <ul className="list-disc pl-4 space-y-1">
                <li>将硬件拖拽到主板对应高亮区域。</li>
                <li>注意安装顺序 (如 CPU 优先于 散热器)。</li>
                <li>安装完成后点击电源键开机。</li>
                <li>点击已安装的硬件可拆卸 (需先关机)。</li>
            </ul>
        </div>
      </div>
    </div>
  );
}
