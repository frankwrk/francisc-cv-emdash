import { useState, useEffect } from "react";
import { api } from "./api.js";

interface Audience { id: string; name: string }
interface Contact { id: string; email: string; first_name?: string; last_name?: string; unsubscribed: boolean }

export function ContactsPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addForm, setAddForm] = useState({ email: "", firstName: "", lastName: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get("audiences").then((r: any) => {
      setAudiences(r.data ?? []);
      if (r.data?.length > 0) setSelectedAudienceId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedAudienceId) return;
    api.get(`audiences/contacts?audienceId=${selectedAudienceId}`).then((r: any) => {
      setContacts(r.data ?? []);
    });
  }, [selectedAudienceId]);

  const handleAdd = async () => {
    if (!addForm.email || !selectedAudienceId) return;
    setAdding(true);
    try {
      await api.post("audiences/contacts/add", {
        audienceId: selectedAudienceId,
        email: addForm.email,
        firstName: addForm.firstName || undefined,
        lastName: addForm.lastName || undefined,
      });
      setAddForm({ email: "", firstName: "", lastName: "" });
      const r = await api.get(`audiences/contacts?audienceId=${selectedAudienceId}`) as any;
      setContacts(r.data ?? []);
    } finally {
      setAdding(false);
    }
  };

  const handleUnsubscribe = async (contactId: string) => {
    await api.post("audiences/contacts/unsubscribe", { audienceId: selectedAudienceId, contactId });
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, unsubscribed: true } : c));
  };

  const handleDelete = async (contactId: string) => {
    await api.post("audiences/contacts/delete", { audienceId: selectedAudienceId, contactId });
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Contacts</h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label>
          Audience:{" "}
          <select value={selectedAudienceId} onChange={(e) => setSelectedAudienceId(e.target.value)}>
            {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>Add contact</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input placeholder="Email *" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
          <input placeholder="First name" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
          <input placeholder="Last name" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
          <button onClick={handleAdd} disabled={adding || !addForm.email}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Email</th>
            <th style={{ padding: "0.5rem" }}>Name</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.5rem" }}>{c.email}</td>
              <td style={{ padding: "0.5rem" }}>{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
              <td style={{ padding: "0.5rem", color: c.unsubscribed ? "#dc2626" : "#16a34a" }}>
                {c.unsubscribed ? "Unsubscribed" : "Subscribed"}
              </td>
              <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                {!c.unsubscribed && (
                  <button onClick={() => handleUnsubscribe(c.id)} style={{ fontSize: "0.8rem" }}>
                    Unsubscribe
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
