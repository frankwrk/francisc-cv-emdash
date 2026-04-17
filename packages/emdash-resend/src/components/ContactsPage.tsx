import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Notice, Select, Table } from "./ui.js";

interface Audience {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
}

export function ContactsPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addForm, setAddForm] = useState({ email: "", firstName: "", lastName: "" });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAudiences = async () => {
      setError(null);
      try {
        const result = await api.get("audiences") as { data?: Audience[] };
        const nextAudiences = result.data ?? [];
        setAudiences(nextAudiences);
        if (nextAudiences.length > 0) {
          setSelectedAudienceId(nextAudiences[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setLoading(false);
      }
    };

    void loadAudiences();
  }, []);

  useEffect(() => {
    const loadContacts = async () => {
      if (!selectedAudienceId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await api.get(`audiences/contacts?audienceId=${selectedAudienceId}`) as { data?: Contact[] };
        setContacts(result.data ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadContacts();
  }, [selectedAudienceId]);

  const refreshContacts = async () => {
    if (!selectedAudienceId) return;
    const result = await api.get(`audiences/contacts?audienceId=${selectedAudienceId}`) as { data?: Contact[] };
    setContacts(result.data ?? []);
  };

  const handleAdd = async () => {
    if (!addForm.email || !selectedAudienceId) return;
    setAdding(true);
    setError(null);
    try {
      await api.post("audiences/contacts/add", {
        audienceId: selectedAudienceId,
        email: addForm.email,
        firstName: addForm.firstName || undefined,
        lastName: addForm.lastName || undefined,
      });
      setAddForm({ email: "", firstName: "", lastName: "" });
      await refreshContacts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleUnsubscribe = async (contactId: string) => {
    setError(null);
    try {
      await api.post("audiences/contacts/unsubscribe", { audienceId: selectedAudienceId, contactId });
      setContacts((prev) => prev.map((contact) => (
        contact.id === contactId
          ? { ...contact, unsubscribed: true }
          : contact
      )));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleDelete = async (contactId: string) => {
    setError(null);
    try {
      await api.post("audiences/contacts/delete", { audienceId: selectedAudienceId, contactId });
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <div className="re-page re-stack">
      <header>
        <h1 className="re-title">Contacts</h1>
        <p className="re-subtitle">Manage audience memberships and individual subscription states.</p>
      </header>

      <div className="re-row">
        <Label>
          Audience
          <Select value={selectedAudienceId} onChange={(event) => setSelectedAudienceId(event.target.value)}>
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="re-grid re-grid--4">
            <Label>
              Email *
              <Input
                type="email"
                placeholder="person@example.com"
                value={addForm.email}
                onChange={(event) => setAddForm({ ...addForm, email: event.target.value })}
              />
            </Label>

            <Label>
              First name
              <Input
                value={addForm.firstName}
                onChange={(event) => setAddForm({ ...addForm, firstName: event.target.value })}
              />
            </Label>

            <Label>
              Last name
              <Input
                value={addForm.lastName}
                onChange={(event) => setAddForm({ ...addForm, lastName: event.target.value })}
              />
            </Label>

            <Label>
              Add
              <Button onClick={handleAdd} disabled={adding || !addForm.email || !selectedAudienceId}>
                {adding ? "Adding..." : "Add contact"}
              </Button>
            </Label>
          </div>
        </CardContent>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}
      {loading && <Notice>Loading contacts...</Notice>}
      {!loading && contacts.length === 0 && !error && (
        <Notice>No contacts in this audience yet.</Notice>
      )}

      <Table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td className="re-kbd">{contact.email}</td>
              <td>{[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}</td>
              <td>
                <Badge variant={contact.unsubscribed ? "destructive" : "success"}>
                  {contact.unsubscribed ? "Unsubscribed" : "Subscribed"}
                </Badge>
              </td>
              <td>
                <div className="re-inline-actions">
                  {!contact.unsubscribed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleUnsubscribe(contact.id)}
                    >
                      Unsubscribe
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete(contact.id)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
