import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Link,
  LogOut,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Place } from "./ActivityForm.jsx";
import { Button, Heading } from "./SharedUI.jsx";
import { isSupabaseConfigured, supabase } from "./supabase.js";
import {
  buildOAuthRedirectUrl,
  getHashRoute,
  getSafeNextRoute,
  inviteStatusMessage,
} from "./sharedTripDomain.js";

function failIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

function roleName(role) {
  return (
    { owner: "เจ้าของ", editor: "ผู้แก้ไข", viewer: "ผู้ดู" }[role] || "สมาชิก"
  );
}

export function createTripRepository(client) {
  async function getMemberships(userId) {
    return failIfError(
      await client
        .from("trip_members")
        .select("trip_id,role")
        .eq("user_id", userId),
    );
  }

  return {
    async getTrips(userId) {
      const memberships = await getMemberships(userId);
      if (!memberships.length) return [];

      const trips = failIfError(
        await client
          .from("trips")
          .select("id,name,owner_id,starts_on,ends_on,updated_at")
          .in(
            "id",
            memberships.map((membership) => membership.trip_id),
          )
          .order("starts_on", { ascending: true }),
      );
      const roles = new Map(
        memberships.map((membership) => [membership.trip_id, membership.role]),
      );
      return trips.map((trip) => ({ ...trip, role: roles.get(trip.id) }));
    },

    async createTrip(name, startsOn, endsOn) {
      return failIfError(
        await client.rpc("create_trip", {
          p_name: name,
          p_starts_on: startsOn,
          p_ends_on: endsOn,
        }),
      );
    },

    async getTrip(tripId, userId) {
      const [trip, memberships, days, activities] = await Promise.all([
        client
          .from("trips")
          .select("id,name,owner_id,starts_on,ends_on,updated_at")
          .eq("id", tripId)
          .maybeSingle(),
        client
          .from("trip_members")
          .select("role")
          .eq("trip_id", tripId)
          .eq("user_id", userId)
          .maybeSingle(),
        client
          .from("trip_days")
          .select("id,day_date,title")
          .eq("trip_id", tripId)
          .order("day_date"),
        client
          .from("activities")
          .select(
            "id,trip_id,trip_day_id,scheduled_time,title,place_name,detail,version",
          )
          .eq("trip_id", tripId)
          .order("scheduled_time"),
      ]);
      const tripData = failIfError(trip);
      if (!tripData) throw new Error("ไม่พบทริปหรือคุณไม่มีสิทธิ์เข้าถึง");
      const membership = failIfError(memberships);
      if (!membership) throw new Error("ไม่พบสิทธิ์สมาชิกของทริปนี้");
      return {
        ...tripData,
        role: membership.role,
        days: failIfError(days),
        activities: failIfError(activities),
      };
    },

    async createInvite(tripId, role, expiresAt, maxUses) {
      return failIfError(
        await client.rpc("create_trip_invite", {
          p_trip_id: tripId,
          p_role: role,
          p_expires_at: expiresAt,
          p_max_uses: maxUses,
        }),
      );
    },

    async listInvites(tripId) {
      return failIfError(
        await client
          .from("invite_codes")
          .select(
            "id,trip_id,role,expires_at,max_uses,used_count,revoked_at,created_at",
          )
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false }),
      );
    },

    async revokeInvite(inviteId) {
      return failIfError(
        await client.rpc("revoke_trip_invite", { p_invite_id: inviteId }),
      );
    },

    async redeemInvite(code) {
      const result = failIfError(
        await client.rpc("redeem_trip_invite", { p_code: code.trim() }),
      );
      return result;
    },

    async addActivity(tripId, tripDayId, values) {
      const rows = failIfError(
        await client
          .from("activities")
          .insert({
            trip_id: tripId,
            trip_day_id: tripDayId,
            scheduled_time: values.time,
            title: values.placeName,
            place_name: values.placeName,
            detail: values.detail,
          })
          .select(
            "id,trip_id,trip_day_id,scheduled_time,title,place_name,detail,version",
          ),
      );
      return rows[0];
    },

    async updateActivity(activity, values) {
      const { data, error } = await client.rpc("update_trip_activity", {
        p_activity_id: activity.id,
        p_expected_version: activity.version,
        p_scheduled_time: values.time,
        p_title: values.placeName,
        p_place_name: values.placeName,
        p_detail: values.detail,
      });
      if (error?.code === "40001") {
        throw new Error(
          "กิจกรรมถูกแก้ไขจากอุปกรณ์อื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง",
        );
      }
      if (error) throw error;
      if (!data) throw new Error("ไม่พบกิจกรรมที่แก้ไข");
      return data;
    },

    subscribeToTrip(tripId, onChange, onStatus = () => {}) {
      const channel = client
        .channel(`trip:${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activities",
            filter: `trip_id=eq.${tripId}`,
          },
          onChange,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "trip_days",
            filter: `trip_id=eq.${tripId}`,
          },
          onChange,
        )
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") onStatus("");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            onStatus(
              error?.message || "การอัปเดตสดขัดข้อง กดโหลดใหม่เพื่อตรวจข้อมูล",
            );
          }
        });
      return () => client.removeChannel(channel);
    },
  };
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AccountEntry({ configured, loading, error, onGoogleLogin }) {
  return (
    <section className="shared-panel">
      <span className="shared-icon">
        <ShieldCheck />
      </span>
      <p className="eyebrow">บัญชี ezytrip</p>
      <h1>วางแผนทริปไปด้วยกัน</h1>
      <p className="shared-copy">
        เข้าสู่ระบบด้วย Google เพื่อสร้างทริปส่วนตัวและชวนเพื่อนด้วยรหัสเชิญ
      </p>
      {!configured && (
        <p role="status" className="shared-notice">
          ยังไม่ได้ตั้งค่า Supabase โปรดใช้คู่มือใน SUPABASE_SETUP.th.md
          เพื่อเปิดใช้งานบัญชี
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={!configured || loading} onClick={onGoogleLogin}>
        {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบด้วย Google"}
      </Button>
      <p className="micro">ไม่มี anonymous login · ข้อมูลเดโมไม่ถูกอัปโหลด</p>
    </section>
  );
}

function DemoReset({ onResetDemo }) {
  return (
    <section className="shared-panel">
      <h2>ข้อมูลสาธิตในอุปกรณ์นี้</h2>
      <p className="shared-copy">
        เริ่มข้อมูลตัวอย่างใหม่ โดยไม่ลบเซสชันบัญชีหรือข้อมูลเว็บไซต์อื่น
      </p>
      <Button
        secondary
        onClick={() => {
          if (
            window.confirm(
              "รีเซ็ตข้อมูลทริปตัวอย่างในอุปกรณ์นี้หรือไม่? ข้อมูลที่แชร์บนบัญชีจะไม่ถูกลบ",
            )
          ) {
            onResetDemo();
          }
        }}
      >
        รีเซ็ตข้อมูลตัวอย่าง
      </Button>
    </section>
  );
}

function TripCreator({ repository, onCreated }) {
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const tripId = await repository.createTrip(name.trim(), startsOn, endsOn);
      onCreated(tripId);
    } catch (reason) {
      setError(reason.message || "สร้างทริปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="shared-panel shared-form" onSubmit={submit}>
      <h2>สร้างทริปใหม่</h2>
      <label className="field">
        ชื่อทริป
        <input
          required
          minLength={1}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="เช่น ทริปเชียงใหม่"
        />
      </label>
      <div className="shared-date-row">
        <label className="field">
          วันเริ่มต้น
          <input
            required
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </label>
        <label className="field">
          วันสิ้นสุด
          <input
            required
            type="date"
            min={startsOn}
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        <Plus size={18} />
        {busy ? "กำลังสร้าง..." : "สร้างแผนทริป"}
      </Button>
    </form>
  );
}

function InviteForm({ repository, onJoined, initialCode = "" }) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function redeem(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await repository.redeemInvite(code);
      if (result.status === "joined" || result.status === "already_member") {
        onJoined(result.trip_id);
      } else {
        setMessage(inviteStatusMessage(result.status));
      }
    } catch (error) {
      setMessage(error.message || "เชื่อมต่อไม่ได้ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="shared-panel shared-form" onSubmit={redeem}>
      <h2>เข้าร่วมทริป</h2>
      <label className="field">
        รหัสเชิญ
        <input
          required
          minLength={64}
          maxLength={64}
          autoCapitalize="none"
          autoComplete="off"
          value={code}
          onChange={(event) => setCode(event.target.value.trim())}
          placeholder="วางรหัสเชิญที่ได้รับ"
        />
      </label>
      {message && (
        <p role="alert" className="error">
          {message}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "กำลังตรวจสอบ..." : "เข้าร่วมทริป"}
      </Button>
    </form>
  );
}

function InviteManager({ repository, trip, onMessage }) {
  const [role, setRole] = useState("editor");
  const [maxUses, setMaxUses] = useState("5");
  const [invites, setInvites] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setInvites(await repository.listInvites(trip.id));
      setError("");
    } catch (reason) {
      setError(reason.message || "โหลดคำเชิญไม่สำเร็จ");
    }
  }, [repository, trip.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createInvite(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNewCode("");
    try {
      const invite = await repository.createInvite(
        trip.id,
        role,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        Number(maxUses),
      );
      setNewCode(invite.code);
      await refresh();
    } catch (reason) {
      setError(reason.message || "สร้างรหัสเชิญไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(inviteId) {
    setError("");
    try {
      const revoked = await repository.revokeInvite(inviteId);
      if (!revoked) throw new Error("รหัสเชิญนี้ถูกยกเลิกไปแล้ว");
      await refresh();
    } catch (reason) {
      setError(reason.message || "ยกเลิกรหัสเชิญไม่สำเร็จ");
    }
  }

  return (
    <section className="shared-panel shared-invites">
      <h2>ชวนเพื่อนเข้าทริป</h2>
      <p className="shared-copy">
        รหัสแสดงครั้งเดียว คัดลอกและส่งให้เพื่อนผ่านช่องทางส่วนตัว
      </p>
      <form onSubmit={createInvite}>
        <label className="field">
          สิทธิ์
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="editor">ผู้แก้ไขแผน</option>
            <option value="viewer">ผู้ดูอย่างเดียว</option>
          </select>
        </label>
        <label className="field">
          จำนวนครั้งสูงสุด (1–20)
          <input
            required
            type="number"
            min="1"
            max="20"
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
          />
        </label>
        <Button disabled={busy || trip.role !== "owner"}>
          <Link size={17} />
          {busy ? "กำลังสร้าง..." : "สร้างรหัสเชิญ · ใช้ได้ 7 วัน"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {newCode && (
        <div className="invite-code">
          <code>{newCode}</code>
          <Button
            secondary
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(newCode);
                onMessage("คัดลอกรหัสเชิญแล้ว");
              } catch {
                onMessage("คัดลอกไม่ได้ โปรดเลือกและคัดลอกรหัสด้วยตนเอง");
              }
            }}
          >
            <Copy size={16} />
            คัดลอก
          </Button>
        </div>
      )}
      <div className="invite-list">
        {invites.map((invite) => (
          <div className="invite-row" key={invite.id}>
            <div>
              <strong>{invite.role === "editor" ? "ผู้แก้ไข" : "ผู้ดู"}</strong>
              <small>
                ใช้แล้ว {invite.used_count}/{invite.max_uses} · หมดอายุ{" "}
                {new Date(invite.expires_at).toLocaleDateString("th-TH")}
                {invite.revoked_at && " · ยกเลิกแล้ว"}
              </small>
            </div>
            {!invite.revoked_at && (
              <button
                className="text-button"
                onClick={() => revoke(invite.id)}
                disabled={trip.role !== "owner"}
              >
                ยกเลิก
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TripList({ repository, session, onOpen, onMessage }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreator, setShowCreator] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTrips(await repository.getTrips(session.user.id));
    } catch (reason) {
      setError(reason.message || "โหลดทริปไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [repository, session.user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <Heading title="ทริปของฉัน" subtitle="วางแผนร่วมกับเพื่อนในที่เดียว" />
      <div className="shared-actions">
        <Button onClick={() => setShowCreator((shown) => !shown)}>
          <Plus size={18} />
          สร้างทริป
        </Button>
        <Button secondary onClick={() => onOpen("/join")}>
          <Users size={17} />
          ใช้รหัสเชิญ
        </Button>
        <button
          className="icon-btn bordered"
          aria-label="โหลดทริปใหม่"
          onClick={refresh}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {showCreator && (
        <TripCreator
          repository={repository}
          onCreated={(id) => onOpen(`/trip/${id}`)}
        />
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="shared-notice" role="status">
          กำลังโหลดทริป...
        </p>
      ) : trips.length ? (
        <div className="shared-trip-list">
          {trips.map((trip) => (
            <button
              className="shared-trip-card"
              key={trip.id}
              onClick={() => onOpen(`/trip/${trip.id}`)}
            >
              <span className="shared-card-icon">
                <Route />
              </span>
              <span>
                <strong>{trip.name}</strong>
                <small>
                  {trip.starts_on} – {trip.ends_on} · {roleName(trip.role)}
                </small>
              </span>
              <ArrowLeft className="shared-card-arrow" />
            </button>
          ))}
        </div>
      ) : (
        !error && (
          <section className="shared-panel shared-empty">
            <CalendarDays size={30} />
            <h2>ยังไม่มีทริปที่แชร์กับคุณ</h2>
            <p>สร้างทริปใหม่หรือเข้าร่วมด้วยรหัสเชิญจากเพื่อน</p>
          </section>
        )
      )}
      <InviteForm
        repository={repository}
        onJoined={(id) => onOpen(`/trip/${id}`)}
      />
    </>
  );
}

function SharedTrip({ repository, session, tripId, onMessage }) {
  const [trip, setTrip] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const modalRef = useRef(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const latest = await repository.getTrip(tripId, session.user.id);
      setTrip(latest);
      setSelectedDayId((selected) =>
        latest.days.some((day) => day.id === selected)
          ? selected
          : latest.days[0]?.id || "",
      );
    } catch (reason) {
      setError(reason.message || "โหลดแผนทริปไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [repository, session.user.id, tripId]);

  useEffect(() => {
    refresh();
    return repository.subscribeToTrip(tripId, refresh, setError);
  }, [refresh, repository, tripId]);

  useEffect(() => {
    if (!editing) return undefined;
    const previous = document.activeElement;
    const modal = modalRef.current;
    modal?.querySelector("input")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setEditing(null);
      if (event.key !== "Tab" || !modal) return;
      const focusable = modal.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]",
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [editing]);

  async function saveActivity(placeName, time, detail) {
    const values = { placeName, time, detail };
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await repository.updateActivity(editing, values);
      } else {
        await repository.addActivity(tripId, selectedDayId, values);
      }
      setEditing(null);
      await refresh();
    } catch (reason) {
      setError(reason.message || "บันทึกกิจกรรมไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <p className="shared-notice" role="status">
        กำลังโหลดแผนทริป...
      </p>
    );
  if (error && !trip) {
    return (
      <section className="shared-panel">
        <p role="alert" className="error">
          {error}
        </p>
        <Button secondary onClick={refresh}>
          ลองอีกครั้ง
        </Button>
      </section>
    );
  }
  if (!trip) return null;

  const selectedDay = trip.days.find((day) => day.id === selectedDayId);
  const activities = trip.activities
    .filter((activity) => activity.trip_day_id === selectedDayId)
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  const selectedActivity =
    activities.find((activity) => activity.id === selectedActivityId) ||
    activities[0];
  const canEdit = trip.role === "owner" || trip.role === "editor";

  return (
    <>
      <div className="shared-trip-heading">
        <button
          className="text-button"
          onClick={() => (location.hash = "#/trips")}
        >
          <ArrowLeft size={17} />
          ทริปของฉัน
        </button>
        <p className="eyebrow">{roleName(trip.role)} · แชร์กับเพื่อน</p>
        <h1>{trip.name}</h1>
        <p className="shared-copy">
          {trip.starts_on} – {trip.ends_on}
        </p>
      </div>
      <div className="shared-trip-actions">
        {trip.role === "owner" && (
          <Button secondary onClick={() => setShowInvite((shown) => !shown)}>
            <Link size={17} />
            จัดการคำเชิญ
          </Button>
        )}
        <Button secondary onClick={refresh}>
          <RefreshCw size={17} /> โหลดใหม่
        </Button>
      </div>
      {showInvite && (
        <InviteManager
          repository={repository}
          trip={trip}
          onMessage={onMessage}
        />
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <section className="shared-planner">
        <div className="shared-day-head">
          <div>
            <p className="eyebrow">แผนรายวัน · แผนที่สาธิต</p>
            <h2>{selectedDay?.title || "เลือกวันเดินทาง"}</h2>
          </div>
          <span className="shared-count">{activities.length} กิจกรรม</span>
        </div>
        <div className="days shared-days" aria-label="เลือกวันเดินทาง">
          {trip.days.map((day, index) => (
            <button
              className={selectedDayId === day.id ? "selected" : ""}
              aria-pressed={selectedDayId === day.id}
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
            >
              <small>วัน {index + 1}</small>
              <strong>{day.day_date.slice(5)}</strong>
            </button>
          ))}
        </div>
        <div className="shared-map" aria-label="ภาพแผนที่แสดงตำแหน่งตัวอย่าง">
          <svg
            viewBox="0 0 720 290"
            role="img"
            aria-label="แผนที่สาธิต ไม่ใช่ตำแหน่งจริง"
          >
            <path
              className="shared-map-water"
              d="M0 210 Q100 165 190 215 T370 218 T550 202 T720 230V290H0Z"
            />
            <path
              className="shared-map-road"
              d="M0 120 C120 155 145 70 265 105 S420 170 520 120 S640 60 720 85"
            />
            <path
              className="shared-map-road secondary"
              d="M88 0 C110 80 235 120 250 290 M480 0 C440 95 525 150 570 290"
            />
          </svg>
          <div className="shared-map-pins">
            {activities.slice(0, 6).map((activity, index) => (
              <button
                className={
                  "shared-map-pin" +
                  (selectedActivity?.id === activity.id ? " selected" : "")
                }
                key={activity.id}
                style={{
                  left: `${14 + (index % 5) * 18}%`,
                  top: `${30 + (index % 2) * 25}%`,
                }}
                aria-label={`แสดงรายละเอียดจุดที่ ${index + 1}: ${activity.place_name}`}
                aria-pressed={selectedActivity?.id === activity.id}
                onClick={() => setSelectedActivityId(activity.id)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          {activities.length === 0 && (
            <span className="shared-map-empty">เพิ่มจุดหมายแรกของวันนี้</span>
          )}
          {activities.length > 6 && (
            <span className="shared-map-empty">
              แสดงหมุด 6 จาก {activities.length} กิจกรรม
            </span>
          )}
          {selectedActivity && (
            <div className="shared-map-stop" role="status">
              <span>
                {selectedActivity.scheduled_time.slice(0, 5)} · จุดที่{" "}
                {activities.findIndex(
                  (activity) => activity.id === selectedActivity.id,
                ) + 1}
              </span>
              <strong>{selectedActivity.place_name}</strong>
              {selectedActivity.detail && (
                <small>{selectedActivity.detail}</small>
              )}
            </div>
          )}
          <span className="shared-map-caption">
            แผนที่และตำแหน่งเป็นข้อมูลสาธิต ไม่ใช่พิกัดหรือเส้นทางจริง
          </span>
        </div>
        <div className="shared-activity-head">
          <h2>กิจกรรมของวันนี้</h2>
          {canEdit && (
            <Button onClick={() => setEditing({})}>
              <Plus size={18} />
              เพิ่มจุดหมาย
            </Button>
          )}
        </div>
        {activities.length ? (
          <ol className="shared-activity-list">
            {activities.map((activity, index) => (
              <li key={activity.id}>
                <span className="shared-activity-index">{index + 1}</span>
                <time>{activity.scheduled_time.slice(0, 5)}</time>
                <span>
                  <strong>{activity.place_name}</strong>
                  {activity.detail && <small>{activity.detail}</small>}
                </span>
                {canEdit && (
                  <button
                    className="text-button"
                    onClick={() => setEditing(activity)}
                  >
                    แก้ไข
                  </button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="shared-notice">วันนี้ยังไม่มีกิจกรรม</p>
        )}
        {!canEdit && <p className="shared-notice">คุณมีสิทธิ์ดูอย่างเดียว</p>}
      </section>
      {editing && (
        <div
          className="shared-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <section
            className="shared-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-edit-title"
          >
            <div className="shared-modal-heading">
              <h2 id="shared-edit-title">
                {editing.id ? "แก้ไขกิจกรรม" : "เพิ่มจุดหมาย"}
              </h2>
              <button
                className="icon-btn"
                onClick={() => setEditing(null)}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
            <Place
              initial={
                editing.id
                  ? [
                      editing.scheduled_time.slice(0, 5),
                      editing.place_name,
                      editing.detail,
                    ]
                  : null
              }
              onSave={saveActivity}
              saving={saving}
            />
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function SharedTripsContent({
  client,
  configured,
  loading,
  session,
  authError,
  page,
  tripId,
  onGoogleLogin,
  onSignOut,
  onMessage,
  onResetDemo,
}) {
  const repository = client ? createTripRepository(client) : null;
  const open = (route) => {
    location.hash = `#${route}`;
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <p className="shared-notice" role="status">
        กำลังตรวจสอบบัญชี...
      </p>
    );
  }
  if (!session) {
    return (
      <>
        <Heading title="ทริปของฉัน" subtitle="บัญชีและทริปที่แชร์" />
        <AccountEntry
          configured={configured}
          loading={loading}
          error={authError}
          onGoogleLogin={onGoogleLogin}
        />
        {page === "account" && <DemoReset onResetDemo={onResetDemo} />}
      </>
    );
  }
  if (!repository) return null;

  if (page === "account") {
    return (
      <>
        <Heading title="บัญชีของคุณ" subtitle={session.user.email} />
        <section className="shared-panel">
          <p className="shared-notice">
            ทริปจริงจะเก็บบน Supabase ·
            ข้อมูลทริปตัวอย่างอยู่ในเครื่องนี้เท่านั้น
          </p>
          <Button secondary onClick={onSignOut}>
            <LogOut size={17} />
            ออกจากระบบ
          </Button>
        </section>
        <DemoReset onResetDemo={onResetDemo} />
      </>
    );
  }

  if (page === "join") {
    const route = getHashRoute(location.hash);
    const initialCode =
      new URLSearchParams(route.split("?")[1] || "").get("code") || "";
    return (
      <>
        <Heading title="เข้าร่วมทริป" subtitle="ใช้รหัสเชิญจากเจ้าของทริป" />
        <InviteForm
          key={initialCode}
          repository={repository}
          onJoined={(id) => open(`/trip/${id}`)}
          initialCode={initialCode}
        />
      </>
    );
  }

  if (page === "trip" && tripId) {
    return (
      <SharedTrip
        repository={repository}
        session={session}
        tripId={tripId}
        onMessage={onMessage}
      />
    );
  }

  return (
    <TripList
      repository={repository}
      session={session}
      onOpen={open}
      onMessage={onMessage}
    />
  );
}

export function useAuthSession(client, configured) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return undefined;
    let active = true;

    const processCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const callbackError = url.searchParams.get("error_description");
      if (url.searchParams.get("auth_callback") !== "1") return;
      const next = getSafeNextRoute(url.searchParams.get("next") || "/trips");
      if (callbackError && active) setError(callbackError);
      if (code) {
        const { error: exchangeError } =
          await client.auth.exchangeCodeForSession(code);
        if (exchangeError && active) setError(exchangeError.message);
      }
      if (!active) return;
      window.history.replaceState({}, "", url.pathname);
      window.location.hash = `#${next}`;
    };

    const initializeSession = async () => {
      try {
        await processCallback();
        const { data, error: sessionError } = await client.auth.getSession();
        if (!active) return;
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
      } catch (reason) {
        if (active) setError(reason.message || "ตรวจสอบเซสชันไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    initializeSession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  return { session, loading, error, setError };
}

export function useGoogleLogin(client, setError) {
  return async (route) => {
    if (!client) return;
    setError("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "openid email profile",
          redirectTo: buildOAuthRedirectUrl(window.location, route),
        },
      });
      if (error) setError(error.message);
    } catch (error) {
      setError(error.message || "เริ่มการเข้าสู่ระบบไม่สำเร็จ");
    }
  };
}

export async function signOut(client) {
  if (!client) return null;
  const { error } = await client.auth.signOut({ scope: "local" });
  return error;
}

export default function SharedTripsRoute({
  page,
  tripId,
  onMessage,
  onResetDemo,
}) {
  const auth = useAuthSession(supabase, isSupabaseConfigured);
  const googleLogin = useGoogleLogin(supabase, auth.setError);

  async function handleSignOut() {
    try {
      const error = await signOut(supabase);
      if (error) auth.setError(error.message);
      else {
        auth.setError("");
        location.hash = "#/trips";
      }
    } catch (error) {
      auth.setError(error.message || "ออกจากระบบไม่สำเร็จ");
    }
  }

  return (
    <SharedTripsContent
      client={supabase}
      configured={isSupabaseConfigured}
      loading={auth.loading}
      session={auth.session}
      authError={auth.error}
      page={page}
      tripId={tripId}
      onGoogleLogin={() => googleLogin(getHashRoute(location.hash))}
      onSignOut={handleSignOut}
      onMessage={onMessage}
      onResetDemo={onResetDemo}
    />
  );
}
