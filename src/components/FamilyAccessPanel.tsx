import React, { useState, useEffect } from "react";
import { BuildingObject, FamilyAccess, FamilyAccessLevel, EquipmentItem, LifeSystemItem } from "../types";
import { UserPlus, Trash2, Edit3, Plus, Users, Wrench, Shield, ChevronDown, ChevronRight, Check, X } from "lucide-react";

interface Props {
  object: BuildingObject;
  currentUserId: string;
  currentUserRole: string;
  canEdit: boolean; // владелец или админ
  onRefresh: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Вспомогательный компонент: модалка подтверждения ────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <p className="text-gray-800 dark:text-gray-200 mb-5 text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">Отмена</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Удалить</button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyAccessPanel({ object, currentUserId, currentUserRole, canEdit, onRefresh, showToast }: Props) {
  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'family' | 'equipment' | 'lifesystems'>('family');

  // ── Family Access State ───────────────────────────────────────────────────
  const [familyList, setFamilyList] = useState<FamilyAccess[]>([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newFamilyEmail, setNewFamilyEmail] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyLevel, setNewFamilyLevel] = useState<FamilyAccessLevel>("view");
  const [familyLoading, setFamilyLoading] = useState(false);
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState<string | null>(null);

  // ── Equipment Registry State ──────────────────────────────────────────────
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [editingEquipId, setEditingEquipId] = useState<string | null>(null);
  const [equipForm, setEquipForm] = useState({ name: "", model: "", serialNumber: "", manufacturer: "", installDate: "", warrantyExpiry: "", location: "", notes: "" });
  const [confirmDeleteEquip, setConfirmDeleteEquip] = useState<string | null>(null);

  // ── Life Systems State ────────────────────────────────────────────────────
  const [lifeSystems, setLifeSystems] = useState<LifeSystemItem[]>([]);
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const [systemForm, setSystemForm] = useState({ name: "", description: "", parameters: "", notes: "" });
  const [confirmDeleteSystem, setConfirmDeleteSystem] = useState<string | null>(null);

  // ── Загрузка данных ───────────────────────────────────────────────────────
  const loadFamilyAccess = async () => {
    try {
      const r = await fetch(`/api/objects/${object.id}/family-access`);
      if (r.ok) setFamilyList(await r.json());
    } catch (e) { console.error(e); }
  };

  const loadEquipment = async () => {
    try {
      const r = await fetch(`/api/objects/${object.id}/equipment`);
      if (r.ok) setEquipment(await r.json());
    } catch (e) { console.error(e); }
  };

  const loadLifeSystems = async () => {
    try {
      const r = await fetch(`/api/objects/${object.id}/life-systems`);
      if (r.ok) setLifeSystems(await r.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadFamilyAccess();
    loadEquipment();
    loadLifeSystems();
  }, [object.id]);

  // ── Семейный доступ: добавить ─────────────────────────────────────────────
  const handleAddFamilyAccess = async () => {
    if (!newFamilyEmail.trim() || !newFamilyName.trim()) {
      showToast("Email и имя обязательны", "error");
      return;
    }
    setFamilyLoading(true);
    try {
      const r = await fetch(`/api/objects/${object.id}/family-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteEmail: newFamilyEmail, inviteName: newFamilyName, accessLevel: newFamilyLevel })
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`Доступ выдан: ${newFamilyName}`, "success");
        setNewFamilyEmail(""); setNewFamilyName(""); setNewFamilyLevel("view");
        setShowAddFamily(false);
        loadFamilyAccess();
        onRefresh();
      } else {
        showToast(data.error || "Ошибка выдачи доступа", "error");
      }
    } finally { setFamilyLoading(false); }
  };

  // ── Семейный доступ: изменить уровень ────────────────────────────────────
  const handleChangeFamilyLevel = async (accessId: string, newLevel: FamilyAccessLevel) => {
    const r = await fetch(`/api/objects/${object.id}/family-access/${accessId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessLevel: newLevel })
    });
    if (r.ok) { showToast("Уровень доступа обновлён", "success"); loadFamilyAccess(); }
    else showToast("Ошибка обновления", "error");
  };

  // ── Семейный доступ: отозвать ─────────────────────────────────────────────
  const handleRevokeFamilyAccess = async (accessId: string) => {
    const r = await fetch(`/api/objects/${object.id}/family-access/${accessId}`, { method: "DELETE" });
    if (r.ok) { showToast("Доступ отозван", "info"); loadFamilyAccess(); onRefresh(); }
    else showToast("Ошибка отзыва доступа", "error");
    setConfirmDeleteFamily(null);
  };

  // ── Оборудование: сохранить (создать / обновить) ──────────────────────────
  const handleSaveEquipment = async () => {
    if (!equipForm.name.trim()) { showToast("Название оборудования обязательно", "error"); return; }
    const url = editingEquipId
      ? `/api/objects/${object.id}/equipment/${editingEquipId}`
      : `/api/objects/${object.id}/equipment`;
    const method = editingEquipId ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipForm)
    });
    const data = await r.json();
    if (r.ok) {
      showToast(editingEquipId ? "Оборудование обновлено" : "Оборудование добавлено", "success");
      setEquipForm({ name: "", model: "", serialNumber: "", manufacturer: "", installDate: "", warrantyExpiry: "", location: "", notes: "" });
      setEditingEquipId(null); setShowAddEquip(false);
      loadEquipment();
    } else { showToast(data.error || "Ошибка сохранения", "error"); }
  };

  const startEditEquip = (item: EquipmentItem) => {
    setEditingEquipId(item.id);
    setEquipForm({ name: item.name, model: item.model || "", serialNumber: item.serialNumber || "", manufacturer: item.manufacturer || "", installDate: item.installDate || "", warrantyExpiry: item.warrantyExpiry || "", location: item.location || "", notes: item.notes || "" });
    setShowAddEquip(true);
  };

  const handleDeleteEquip = async (itemId: string) => {
    const r = await fetch(`/api/objects/${object.id}/equipment/${itemId}`, { method: "DELETE" });
    if (r.ok) { showToast("Запись удалена", "info"); loadEquipment(); }
    else showToast("Ошибка удаления", "error");
    setConfirmDeleteEquip(null);
  };

  // ── Системы жизнеобеспечения: сохранить ───────────────────────────────────
  const handleSaveSystem = async () => {
    if (!systemForm.name.trim() || !systemForm.description.trim()) {
      showToast("Наименование и описание обязательны", "error"); return;
    }
    const url = editingSystemId
      ? `/api/objects/${object.id}/life-systems/${editingSystemId}`
      : `/api/objects/${object.id}/life-systems`;
    const method = editingSystemId ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(systemForm)
    });
    const data = await r.json();
    if (r.ok) {
      showToast(editingSystemId ? "Система обновлена" : "Система добавлена", "success");
      setSystemForm({ name: "", description: "", parameters: "", notes: "" });
      setEditingSystemId(null); setShowAddSystem(false);
      loadLifeSystems();
    } else { showToast(data.error || "Ошибка сохранения", "error"); }
  };

  const startEditSystem = (s: LifeSystemItem) => {
    setEditingSystemId(s.id);
    setSystemForm({ name: s.name, description: s.description, parameters: s.parameters || "", notes: s.notes || "" });
    setShowAddSystem(true);
  };

  const handleDeleteSystem = async (systemId: string) => {
    const r = await fetch(`/api/objects/${object.id}/life-systems/${systemId}`, { method: "DELETE" });
    if (r.ok) { showToast("Система удалена", "info"); loadLifeSystems(); }
    else showToast("Ошибка удаления", "error");
    setConfirmDeleteSystem(null);
  };

  // ── Стили ─────────────────────────────────────────────────────────────────
  const tabBase = "px-4 py-2 text-sm font-medium rounded-lg transition-colors";
  const tabActive = "bg-blue-600 text-white shadow";
  const tabInactive = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";
  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";
  const btnPrimary = "px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors";
  const btnSecondary = "px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors";

  return (
    <div className="space-y-4">
      {/* Подтверждения удаления */}
      {confirmDeleteFamily && <ConfirmModal message="Отозвать доступ у этого пользователя?" onConfirm={() => handleRevokeFamilyAccess(confirmDeleteFamily)} onCancel={() => setConfirmDeleteFamily(null)} />}
      {confirmDeleteEquip && <ConfirmModal message="Удалить эту запись из реестра оборудования?" onConfirm={() => handleDeleteEquip(confirmDeleteEquip)} onCancel={() => setConfirmDeleteEquip(null)} />}
      {confirmDeleteSystem && <ConfirmModal message="Удалить эту систему из технического паспорта?" onConfirm={() => handleDeleteSystem(confirmDeleteSystem)} onCancel={() => setConfirmDeleteSystem(null)} />}

      {/* Вкладки разделов */}
      <div className="flex gap-2 flex-wrap">
        <button className={`${tabBase} ${activeSection === 'family' ? tabActive : tabInactive}`} onClick={() => setActiveSection('family')}>
          <span className="flex items-center gap-1.5"><Users size={14} /> Семейный доступ</span>
        </button>
        <button className={`${tabBase} ${activeSection === 'equipment' ? tabActive : tabInactive}`} onClick={() => setActiveSection('equipment')}>
          <span className="flex items-center gap-1.5"><Wrench size={14} /> Реестр оборудования</span>
        </button>
        <button className={`${tabBase} ${activeSection === 'lifesystems' ? tabActive : tabInactive}`} onClick={() => setActiveSection('lifesystems')}>
          <span className="flex items-center gap-1.5"><Shield size={14} /> Техпаспорт / Системы</span>
        </button>
      </div>

      {/* ─── РАЗДЕЛ: СЕМЕЙНЫЙ ДОСТУП ─────────────────────────────────────── */}
      {activeSection === 'family' && (
        <div className="space-y-3">
          {canEdit && (
            <button onClick={() => setShowAddFamily(!showAddFamily)} className={btnPrimary + " flex items-center gap-2"}>
              <UserPlus size={15} /> Выдать доступ
            </button>
          )}

          {/* Форма добавления доступа */}
          {showAddFamily && canEdit && (
            <div className="border border-blue-200 dark:border-blue-700 rounded-xl p-4 bg-blue-50 dark:bg-blue-950/30 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Новый доступ к объекту</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Имя пользователя *</label>
                  <input className={inputCls} placeholder="Иванова Мария Петровна" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input className={inputCls} placeholder="maria@email.com" value={newFamilyEmail} onChange={e => setNewFamilyEmail(e.target.value)} type="email" />
                </div>
                <div>
                  <label className={labelCls}>Уровень доступа</label>
                  <select className={inputCls} value={newFamilyLevel} onChange={e => setNewFamilyLevel(e.target.value as FamilyAccessLevel)}>
                    <option value="view">Только просмотр</option>
                    <option value="edit">Просмотр и редактирование</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddFamilyAccess} disabled={familyLoading} className={btnPrimary}>
                  {familyLoading ? "Сохранение..." : "Выдать доступ"}
                </button>
                <button onClick={() => setShowAddFamily(false)} className={btnSecondary}>Отмена</button>
              </div>
            </div>
          )}

          {/* Список доступов */}
          {familyList.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">Семейный и доверенный доступ не настроен</p>
          ) : (
            <div className="space-y-2">
              {familyList.map(fa => (
                <div key={fa.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{fa.inviteName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fa.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : fa.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-red-100 text-red-700'}`}>
                        {fa.status === 'active' ? 'Активен' : fa.status === 'pending' ? 'Ожидает' : 'Отозван'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{fa.inviteEmail}</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                        value={fa.accessLevel}
                        onChange={e => handleChangeFamilyLevel(fa.id, e.target.value as FamilyAccessLevel)}
                      >
                        <option value="view">Просмотр</option>
                        <option value="edit">Редактирование</option>
                      </select>
                      <button onClick={() => setConfirmDeleteFamily(fa.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── РАЗДЕЛ: РЕЕСТР ОБОРУДОВАНИЯ ─────────────────────────────────── */}
      {activeSection === 'equipment' && (
        <div className="space-y-3">
          {canEdit && (
            <button onClick={() => { setShowAddEquip(!showAddEquip); setEditingEquipId(null); setEquipForm({ name: "", model: "", serialNumber: "", manufacturer: "", installDate: "", warrantyExpiry: "", location: "", notes: "" }); }} className={btnPrimary + " flex items-center gap-2"}>
              <Plus size={15} /> Добавить оборудование
            </button>
          )}

          {/* Форма добавления / редактирования оборудования */}
          {showAddEquip && canEdit && (
            <div className="border border-green-200 dark:border-green-700 rounded-xl p-4 bg-green-50 dark:bg-green-950/30 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {editingEquipId ? "Редактировать оборудование" : "Новый элемент реестра"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Название *</label><input className={inputCls} placeholder="Котёл отопления" value={equipForm.name} onChange={e => setEquipForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className={labelCls}>Модель</label><input className={inputCls} placeholder="Viessmann Vitodens 200" value={equipForm.model} onChange={e => setEquipForm(p => ({ ...p, model: e.target.value }))} /></div>
                <div><label className={labelCls}>Серийный номер</label><input className={inputCls} placeholder="SN-2024-XXXXX" value={equipForm.serialNumber} onChange={e => setEquipForm(p => ({ ...p, serialNumber: e.target.value }))} /></div>
                <div><label className={labelCls}>Производитель</label><input className={inputCls} placeholder="Viessmann" value={equipForm.manufacturer} onChange={e => setEquipForm(p => ({ ...p, manufacturer: e.target.value }))} /></div>
                <div><label className={labelCls}>Дата установки</label><input className={inputCls} type="date" value={equipForm.installDate} onChange={e => setEquipForm(p => ({ ...p, installDate: e.target.value }))} /></div>
                <div><label className={labelCls}>Гарантия до</label><input className={inputCls} type="date" value={equipForm.warrantyExpiry} onChange={e => setEquipForm(p => ({ ...p, warrantyExpiry: e.target.value }))} /></div>
                <div><label className={labelCls}>Расположение</label><input className={inputCls} placeholder="Котельная, 1 этаж" value={equipForm.location} onChange={e => setEquipForm(p => ({ ...p, location: e.target.value }))} /></div>
                <div><label className={labelCls}>Примечания</label><input className={inputCls} placeholder="..." value={equipForm.notes} onChange={e => setEquipForm(p => ({ ...p, notes: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveEquipment} className={btnPrimary}>{editingEquipId ? "Сохранить" : "Добавить"}</button>
                <button onClick={() => { setShowAddEquip(false); setEditingEquipId(null); }} className={btnSecondary}>Отмена</button>
              </div>
            </div>
          )}

          {/* Таблица оборудования */}
          {equipment.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">Реестр оборудования пуст</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    {["Название", "Модель", "Серийный №", "Производитель", "Установлено", "Гарантия", "Расположение", ""].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {equipment.map(item => (
                    <tr key={item.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{item.name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.model || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{item.serialNumber || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.manufacturer || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{item.installDate ? new Date(item.installDate).toLocaleDateString('ru-RU') : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.warrantyExpiry ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(item.warrantyExpiry) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {new Date(item.warrantyExpiry).toLocaleDateString('ru-RU')}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.location || "—"}</td>
                      {canEdit && (
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => startEditEquip(item)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit3 size={13} /></button>
                            <button onClick={() => setConfirmDeleteEquip(item.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── РАЗДЕЛ: ТЕХПАСПОРТ / СИСТЕМЫ ЖИЗНЕОБЕСПЕЧЕНИЯ ──────────────── */}
      {activeSection === 'lifesystems' && (
        <div className="space-y-3">
          {canEdit && (
            <button onClick={() => { setShowAddSystem(!showAddSystem); setEditingSystemId(null); setSystemForm({ name: "", description: "", parameters: "", notes: "" }); }} className={btnPrimary + " flex items-center gap-2"}>
              <Plus size={15} /> Добавить систему
            </button>
          )}

          {/* Форма добавления / редактирования системы */}
          {showAddSystem && canEdit && (
            <div className="border border-purple-200 dark:border-purple-700 rounded-xl p-4 bg-purple-50 dark:bg-purple-950/30 space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {editingSystemId ? "Редактировать систему" : "Новая система жизнеобеспечения"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Наименование системы *</label>
                  <input className={inputCls} placeholder="Система отопления" value={systemForm.name} onChange={e => setSystemForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Технические параметры</label>
                  <input className={inputCls} placeholder="Мощность: 24 кВт, давление: 1.5 бар" value={systemForm.parameters} onChange={e => setSystemForm(p => ({ ...p, parameters: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Описание работы системы *</label>
                  <textarea className={inputCls + " resize-none"} rows={3} placeholder="Описание принципа работы, схемы подключения и режима обслуживания..." value={systemForm.description} onChange={e => setSystemForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Примечания</label>
                  <input className={inputCls} placeholder="Дополнительная информация..." value={systemForm.notes} onChange={e => setSystemForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveSystem} className={btnPrimary}>{editingSystemId ? "Сохранить" : "Добавить"}</button>
                <button onClick={() => { setShowAddSystem(false); setEditingSystemId(null); }} className={btnSecondary}>Отмена</button>
              </div>
            </div>
          )}

          {/* Карточки систем */}
          {lifeSystems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">Технический паспорт пуст — системы не добавлены</p>
          ) : (
            <div className="space-y-3">
              {lifeSystems.map(sys => (
                <div key={sys.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{sys.name}</h4>
                      {sys.parameters && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{sys.parameters}</p>}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{sys.description}</p>
                      {sys.notes && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">{sys.notes}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditSystem(sys)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit3 size={14} /></button>
                        <button onClick={() => setConfirmDeleteSystem(sys.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
