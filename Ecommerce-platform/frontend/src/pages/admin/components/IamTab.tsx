import { useEffect, useState } from "react";
import {
  Shield,
  Plus,
  Trash2,
  KeyRound,
  UserCheck,
  Check,
  RefreshCw,
  ChevronDown,
  Lock,
} from "lucide-react";
import { adminService } from "@/services/adminService";

interface IamTabProps {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

type IamSection = "roles" | "policies" | "user_permissions";

interface PolicyItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  effect: "ALLOW" | "DENY";
  actions: string[];
  is_system: boolean;
}

interface RoleItem {
  id: number;
  role_name: string;
  description?: string;
  is_system: boolean;
  policies?: PolicyItem[];
}

interface ActionCategory {
  name: string;
  prefix: string;
}

export const IamTab = ({ showToast, showConfirm }: IamTabProps) => {
  const [section, setSection] = useState<IamSection>("roles");
  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [actionsList, setActionsList] = useState<string[]>([]);
  const [actionCategories, setActionCategories] = useState<ActionCategory[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form tạo Role
  const [roleForm, setRoleForm] = useState({
    role_name: "",
    description: "",
    policy_ids: [] as number[],
  });
  const [attachPolicyByRole, setAttachPolicyByRole] = useState<Record<number, string>>({});

  // Form tạo Policy
  const [policyForm, setPolicyForm] = useState({
    name: "",
    code: "",
    description: "",
    effect: "ALLOW" as "ALLOW" | "DENY",
    actions: [] as string[],
  });

  // Phân quyền User
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userPermData, setUserPermData] = useState<any>(null);
  const [selectedUserRoleId, setSelectedUserRoleId] = useState<string>("");
  const [selectedDirectPolicyId, setSelectedDirectPolicyId] = useState<string>("");

  const fetchAllIamData = async () => {
    setLoading(true);
    try {
      const [rolesRes, policiesRes, actionsRes, usersRes] = await Promise.all([
        adminService.getIamRoles(),
        adminService.getIamPolicies(),
        adminService.getIamActions(),
        adminService.getUsersByRole("all"),
      ]);

      setRoles(rolesRes?.data || []);
      setPolicies(policiesRes?.data || []);

      const catalog = actionsRes?.data;
      if (catalog?.actions) {
        setActionsList(Object.values(catalog.actions));
      }
      if (catalog?.categories) {
        setActionCategories(catalog.categories);
      }

      const userList = Array.isArray(usersRes?.data)
        ? usersRes.data
        : usersRes?.data?.users || usersRes?.users || [];
      setUsers(userList);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể tải dữ liệu IAM", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIamData();
  }, []);

  const loadUserPermissions = async (userId: string) => {
    if (!userId) {
      setUserPermData(null);
      return;
    }
    try {
      const res = await adminService.getUserIamPermissions(userId);
      setUserPermData(res?.data || null);
      if (res?.data?.role?.id) {
        setSelectedUserRoleId(String(res.data.role.id));
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Lỗi tải quyền hạn user", "error");
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId);
    }
  }, [selectedUserId]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.role_name.trim()) {
      showToast("Vui lòng nhập tên Role", "error");
      return;
    }
    try {
      await adminService.createIamRole(roleForm);
      showToast("Tạo Role mới thành công!", "success");
      setRoleForm({ role_name: "", description: "", policy_ids: [] });
      fetchAllIamData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể tạo Role", "error");
    }
  };

  const handleAttachPolicyToRole = async (roleId: number) => {
    const policyId = attachPolicyByRole[roleId];
    if (!policyId) {
      showToast("Vui lòng chọn Policy từ danh sách", "info");
      return;
    }
    try {
      await adminService.attachPolicyToRole(roleId, Number(policyId));
      showToast("Đã gắn Policy vào Role", "success");
      setAttachPolicyByRole((prev) => ({ ...prev, [roleId]: "" }));
      fetchAllIamData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể gắn Policy", "error");
    }
  };

  const handleDetachPolicyFromRole = (roleId: number, policyId: number, policyName: string) => {
    showConfirm(`Gỡ policy "${policyName}" khỏi role này?`, async () => {
      try {
        await adminService.detachPolicyFromRole(roleId, policyId);
        showToast("Đã gỡ Policy khỏi Role", "success");
        fetchAllIamData();
      } catch (err: any) {
        showToast(err?.response?.data?.message || "Lỗi gỡ Policy", "error");
      }
    });
  };

  const handleDeleteRole = (role: RoleItem) => {
    showConfirm(`Xóa role "${role.role_name}"?`, async () => {
      try {
        await adminService.deleteIamRole(role.id);
        showToast("Đã xóa Role", "success");
        fetchAllIamData();
      } catch (err: any) {
        showToast(err?.response?.data?.message || "Không thể xóa Role", "error");
      }
    });
  };

  const togglePolicyAction = (action: string) => {
    setPolicyForm((prev) => ({
      ...prev,
      actions: prev.actions.includes(action)
        ? prev.actions.filter((a) => a !== action)
        : [...prev.actions, action],
    }));
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm.name.trim() || !policyForm.code.trim() || policyForm.actions.length === 0) {
      showToast("Vui lòng nhập Tên, Mã Code và chọn ít nhất 1 Action", "error");
      return;
    }
    try {
      await adminService.createIamPolicy(policyForm);
      showToast("Tạo Policy thành công!", "success");
      setPolicyForm({ name: "", code: "", description: "", effect: "ALLOW", actions: [] });
      fetchAllIamData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể tạo Policy", "error");
    }
  };

  const handleDeletePolicy = (policy: PolicyItem) => {
    showConfirm(`Xóa policy "${policy.name}" (${policy.code})?`, async () => {
      try {
        await adminService.deleteIamPolicy(policy.id);
        showToast("Đã xóa Policy", "success");
        fetchAllIamData();
      } catch (err: any) {
        showToast(err?.response?.data?.message || "Không thể xóa Policy", "error");
      }
    });
  };

  const handleAssignUserRole = async () => {
    if (!selectedUserId || !selectedUserRoleId) return;
    try {
      await adminService.assignRoleToUser(selectedUserId, Number(selectedUserRoleId));
      showToast("Cập nhật Role cho User thành công", "success");
      loadUserPermissions(selectedUserId);
      fetchAllIamData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể đổi Role cho User", "error");
    }
  };

  const handleAttachDirectPolicyToUser = async () => {
    if (!selectedUserId || !selectedDirectPolicyId) {
      showToast("Vui lòng chọn Policy muốn gán", "info");
      return;
    }
    try {
      await adminService.attachPolicyToUser(selectedUserId, Number(selectedDirectPolicyId));
      showToast("Đã gán Policy trực tiếp cho User", "success");
      setSelectedDirectPolicyId("");
      loadUserPermissions(selectedUserId);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Không thể gán Policy", "error");
    }
  };

  const handleDetachDirectPolicyFromUser = (policyId: number, name: string) => {
    if (!selectedUserId) return;
    showConfirm(`Gỡ Policy trực tiếp "${name}" khỏi User này?`, async () => {
      try {
        await adminService.detachPolicyFromUser(selectedUserId, policyId);
        showToast("Đã gỡ Policy trực tiếp", "success");
        loadUserPermissions(selectedUserId);
      } catch (err: any) {
        showToast(err?.response?.data?.message || "Không thể gỡ Policy", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Thanh điều khiển dạng Drop-list chọn thao tác IAM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Quản trị Phân quyền IAM (Roles &amp; Policies)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn thao tác từ danh sách thả xuống để tạo Role, tạo Policy hoặc gán quyền cho nhân viên
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[260px]">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as IamSection)}
              className="w-full appearance-none min-h-[42px] pl-3.5 pr-9 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="roles">1. Quản lý Roles (Tạo &amp; Gắn Policy)</option>
              <option value="policies">2. Quản lý Policies (Tạo &amp; Sửa quyền)</option>
              <option value="user_permissions">3. Gán Role &amp; Policy cho User</option>
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>

          <button
            type="button"
            onClick={fetchAllIamData}
            disabled={loading}
            className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: QUẢN LÝ ROLES */}
      {section === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form tạo Role mới */}
          <form
            onSubmit={handleCreateRole}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 h-fit"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">Tạo Role mới</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tên Role (role_name) *
              </label>
              <input
                type="text"
                value={roleForm.role_name}
                onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                placeholder="vd: staff_marketing"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mô tả vai trò
              </label>
              <textarea
                rows={2}
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Mô tả trách nhiệm của role..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Gắn sẵn Policy (tuỳ chọn)
              </label>
              <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50">
                {policies.map((p) => {
                  const checked = roleForm.policy_ids.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white p-1 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setRoleForm((prev) => ({
                            ...prev,
                            policy_ids: checked
                              ? prev.policy_ids.filter((id) => id !== p.id)
                              : [...prev.policy_ids, p.id],
                          }))
                        }
                      />
                      <span className="font-medium truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{p.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[42px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Tạo Role
            </button>
          </form>

          {/* Danh sách Roles */}
          <div className="lg:col-span-2 space-y-4">
            {roles.map((role) => {
              const attachedIds = new Set((role.policies || []).map((p) => p.id));
              const availablePolicies = policies.filter((p) => !attachedIds.has(p.id));
              const isAdminRole = role.role_name === "admin";

              return (
                <div
                  key={role.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{role.role_name}</span>
                        {role.is_system && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            <Lock size={10} /> System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {role.description || "Không có mô tả"}
                      </p>
                    </div>

                    {!role.is_system && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Xóa Role"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Policies đang gắn */}
                  <div className="flex flex-wrap gap-2">
                    {(role.policies || []).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">Chưa gắn Policy nào</span>
                    ) : (
                      (role.policies || []).map((pol) => (
                        <span
                          key={pol.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                        >
                          <KeyRound size={12} className="text-slate-500" />
                          <span>{pol.name}</span>
                          {!isAdminRole && (
                            <button
                              type="button"
                              onClick={() => handleDetachPolicyFromRole(role.id, pol.id, pol.name)}
                              className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                              title="Gỡ Policy"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Drop-list gắn thêm Policy */}
                  {!isAdminRole && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <select
                        value={attachPolicyByRole[role.id] || ""}
                        onChange={(e) =>
                          setAttachPolicyByRole((prev) => ({ ...prev, [role.id]: e.target.value }))
                        }
                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
                      >
                        <option value="">-- Chọn Policy để gắn vào {role.role_name} --</option>
                        {availablePolicies.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAttachPolicyToRole(role.id)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Gắn Policy
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: QUẢN LÝ POLICIES */}
      {section === "policies" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreatePolicy}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 h-fit"
          >
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">Tạo Policy mới</h3>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tên Policy *</label>
              <input
                type="text"
                value={policyForm.name}
                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                placeholder="vd: Product Moderator Policy"
                className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mã Code *</label>
                <input
                  type="text"
                  value={policyForm.code}
                  onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value })}
                  placeholder="PRODUCT_MOD"
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Hiệu lực</label>
                <select
                  value={policyForm.effect}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, effect: e.target.value as "ALLOW" | "DENY" })
                  }
                  className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
                >
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả</label>
              <input
                type="text"
                value={policyForm.description}
                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                placeholder="Mô tả phạm vi quyền..."
                className="w-full min-h-[40px] px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Chọn Actions ({policyForm.actions.length} đã chọn) *
              </label>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-2">
                {actionCategories.map((cat) => {
                  const regex = new RegExp(`^(${cat.prefix})`);
                  const matched = actionsList.filter((a) => regex.test(a));
                  if (matched.length === 0) return null;
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        {cat.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matched.map((act) => {
                          const selected = policyForm.actions.includes(act);
                          return (
                            <button
                              type="button"
                              key={act}
                              onClick={() => togglePolicyAction(act)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                selected
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              {selected && <Check size={10} className="inline mr-1" />}
                              {act}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[42px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Tạo Policy
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {policies.map((pol) => (
              <div
                key={pol.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{pol.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono">
                        {pol.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pol.effect === "ALLOW"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {pol.effect}
                      </span>
                      {pol.is_system && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          <Lock size={10} /> System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{pol.description || "—"}</p>
                  </div>

                  {!pol.is_system && (
                    <button
                      type="button"
                      onClick={() => handleDeletePolicy(pol)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="Xóa Policy"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(pol.actions || []).map((act) => (
                    <span
                      key={act}
                      className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: GÁN ROLE & DIRECT POLICY CHO USER */}
      {section === "user_permissions" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-slate-900" />
            <h3 className="text-sm font-bold text-slate-900">
              Chọn Tài khoản để phân quyền trực tiếp
            </h3>
          </div>

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full md:max-w-md min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
          >
            <option value="">-- Chọn User (Email / Role) --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                #{u.id} — {u.email} ({u.role?.role_name || u.role || "user"})
              </option>
            ))}
          </select>

          {userPermData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* Đổi Role của User */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500">Vai trò (Role)</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUserRoleId}
                    onChange={(e) => setSelectedUserRoleId(e.target.value)}
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.role_name} — {r.description || ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignUserRole}
                    className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Lưu Role
                  </button>
                </div>

                {/* Quyền hiệu lực */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Quyền hiệu lực (Effective Actions)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(userPermData.effective_actions || []).map((act: string) => (
                      <span
                        key={act}
                        className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-mono"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direct Inline Policies */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-500">
                  Direct Policies (Gắn trực tiếp trên User)
                </h4>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDirectPolicyId}
                    onChange={(e) => setSelectedDirectPolicyId(e.target.value)}
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
                  >
                    <option value="">-- Chọn Policy để gắn trực tiếp --</option>
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAttachDirectPolicyToUser}
                    className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Gắn Policy
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(userPermData.direct_policies || []).length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Chưa có Direct Policy nào
                    </span>
                  ) : (
                    (userPermData.direct_policies || []).map((p: PolicyItem) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                      >
                        <span>{p.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDetachDirectPolicyFromUser(p.id, p.name)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Gỡ Policy"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
