import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { Button } from "./SharedUI.jsx";

function PlaceLocationPicker({ coordinates, onSelect, onPickCenter }) {
  const containerRef = useRef(null);
  const markerRef = useRef(null);
  const mapRef = useRef(null);
  const selectionRef = useRef(coordinates);
  const onSelectRef = useRef(onSelect);
  const onPickCenterRef = useRef(onPickCenter);
  selectionRef.current = coordinates;
  onSelectRef.current = onSelect;
  onPickCenterRef.current = onPickCenter;

  useEffect(() => {
    let disposed = false;
    let map;
    let marker;
    const start = async () => {
      try {
        const maplibregl = await import(
          /* @vite-ignore */ "https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs"
        );
        if (disposed || !containerRef.current) return;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: selectionRef.current || [114.1694, 22.2933],
          zoom: selectionRef.current ? 15 : 13,
          attributionControl: false,
          dragRotate: false,
          scrollZoom: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        mapRef.current = map;
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "top-left",
        );

        const setMarker = (point) => {
          if (!marker) {
            const element = document.createElement("div");
            element.className = "place-map-pin";
            marker = new maplibregl.Marker({ element, anchor: "bottom" })
              .setLngLat(point)
              .addTo(map);
            markerRef.current = marker;
          } else marker.setLngLat(point);
        };

        map.on("load", () => {
          if (disposed) return;
          if (selectionRef.current) setMarker(selectionRef.current);
        });
        map.on("click", (event) => {
          const point = [event.lngLat.lng, event.lngLat.lat];
          setMarker(point);
          onSelectRef.current(point);
        });
        onPickCenterRef.current(() => {
          if (!mapRef.current) return;
          const center = mapRef.current.getCenter();
          const point = [center.lng, center.lat];
          setMarker(point);
          onSelectRef.current(point);
        });
      } catch {
        // The picker remains optional if hosted map tiles are temporarily unavailable.
      }
    };
    start();
    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!coordinates || !mapRef.current) return;
    mapRef.current.easeTo({
      center: coordinates,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 220,
    });
    if (markerRef.current) markerRef.current.setLngLat(coordinates);
  }, [coordinates]);

  return (
    <div
      className="place-map-picker"
      ref={containerRef}
      role="application"
      aria-label="แตะเพื่อเลือกตำแหน่งบนแผนที่"
    />
  );
}

export function Place({ initial, onSave, saving = false }) {
  const [name, setName] = useState(initial?.[1] || "");
  const [time, setTime] = useState(
    /^\d{2}:\d{2}$/.test(initial?.[0] || "") ? initial[0] : "09:00",
  );
  const [detail, setDetail] = useState(initial?.[2] || "");
  const [coordinates, setCoordinates] = useState(initial?.[4] || null);
  const pickCenterRef = useRef(() => {});

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSave(name.trim(), time, detail.trim(), coordinates);
      }}
    >
      <label className="field">
        เวลา
        <input
          required
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <label className="field">
        ชื่อสถานที่
        <input
          required
          maxLength="100"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="อยากไปที่ไหนอีก?"
        />
      </label>
      <label className="field">
        รายละเอียด (ไม่จำเป็น)
        <input
          maxLength="120"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="เช่น สถานีหรือย่านใกล้เคียง"
        />
      </label>
      <div className="place-location-heading">
        <span>
          <MapPin size={16} /> ปักหมุดตำแหน่งจริง
        </span>
        <small>แตะจุดบนแผนที่</small>
      </div>
      <PlaceLocationPicker
        coordinates={coordinates}
        onSelect={setCoordinates}
        onPickCenter={(pick) => {
          pickCenterRef.current = pick;
        }}
      />
      <button
        className="place-map-center-button"
        type="button"
        onClick={() => pickCenterRef.current()}
      >
        <MapPin size={15} /> เลือกตำแหน่งตรงกลางแผนที่
      </button>
      <p
        className={`place-location-status ${coordinates ? "selected" : ""}`}
        aria-live="polite"
      >
        {coordinates ? (
          <>
            <CheckCircle2 size={15} /> เลือกตำแหน่งแล้ว · ใช้คำนวณเส้นทางได้
          </>
        ) : (
          "เลื่อนแผนที่แล้วแตะตำแหน่งของสถานที่"
        )}
      </p>
      <p className="place-map-attribution">
        © OpenStreetMap contributors · OpenFreeMap
      </p>
      <Button type="submit" disabled={saving}>
        {saving
          ? "กำลังบันทึก..."
          : initial
            ? "บันทึกการแก้ไข"
            : "เพิ่มลงในวันเที่ยว"}
      </Button>
    </form>
  );
}
