import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import {
  Compass,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowLeft,
  ChevronRight,
  Search,
  House,
  Route,
  MapPin,
  CalendarDays,
  Heart,
  Star,
  TrainFront,
  BusFront,
  Footprints,
  Utensils,
  Users,
  Plus,
  Settings,
  Link,
  Copy,
  Check,
  CheckCircle2,
  X,
  SlidersHorizontal,
  CloudSun,
  BedDouble,
  Ship,
  ExternalLink,
  Navigation,
  Info,
  Sparkles,
} from "lucide-react";
import { Button, Heading } from "./SharedUI.jsx";
import { Place } from "./ActivityForm.jsx";
import { findKmbRoutes } from "./busRoutes.js";
import { clearDemoData } from "./sharedTripDomain.js";
import { hotels, initialQuery, initialDays } from "./data";
import {
  RATE,
  nightsBetween,
  budgetAmount,
  splitMeal,
  balances,
} from "./domain";
const fmt = (n) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
const people = ["คุณ", "เพื่อน A", "เพื่อน B"];
const SharedTripsRoute = lazy(() => import("./sharedTrips.jsx"));
function useSaved(key, initial) {
  const [value, set] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, set];
}
const go = (path) => {
  location.hash = path;
  window.scrollTo(0, 0);
};
function Price({ amount, currency, large = false }) {
  return (
    <span className={"price" + (large ? " large" : "")}>
      {currency === "THB" ? "฿" : "HK$"}
      {fmt(amount * (currency === "THB" ? RATE : 1))}
    </span>
  );
}
function Currency({ currency, setCurrency }) {
  return (
    <button
      className="currency"
      aria-label="สลับสกุลเงิน HKD และ THB"
      onClick={() => setCurrency(currency === "HKD" ? "THB" : "HKD")}
    >
      {currency}
      <ArrowLeftRight size={14} />
      {currency === "HKD" ? "THB" : "HKD"}
    </button>
  );
}
function Demo() {
  return (
    <p className="demo-note">
      <Info size={14} />
      <span>
        ข้อมูลตัวอย่าง · ราคา รีวิว เวลาเดินทาง และเรทเงินไม่ใช่ข้อมูลจริง
      </span>
    </p>
  );
}
function Empty({ title, text, action, label }) {
  return (
    <div className="empty">
      <Compass size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <Button secondary onClick={action}>
          {label}
        </Button>
      )}
    </div>
  );
}
function Sheet({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prior = document.activeElement,
      old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = ref.current.querySelectorAll(
          "button,a,input,select,textarea",
        );
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, []);
  return (
    <div className="scrim" onClick={onClose}>
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex="-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="ปิด" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Hotel({ hotel: h, currency, saved, onSave }) {
  return (
    <article className="hotel-card">
      <div className="hotel-image">
        <a href={"#/stay/" + h.id} aria-label={"ดู " + h.name}>
          <img
            src={"/assets/" + h.image}
            alt="ภาพห้องพักประกอบ ไม่ใช่ภาพโรงแรมจริง"
            loading="lazy"
          />
        </a>
        <span className="image-tag">{h.tag}</span>
        <button
          className={"save " + (saved ? "is-saved" : "")}
          aria-label={(saved ? "เลิกบันทึก " : "บันทึก ") + h.name}
          aria-pressed={saved}
          onClick={() => onSave(h.id)}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="hotel-body">
        <div className="meta">
          <MapPin size={13} />
          {h.area}
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {h.rating}
          </span>
        </div>
        <a className="hotel-name" href={"#/stay/" + h.id}>
          {h.name}
        </a>
        <p className="hotel-reason">
          <TrainFront size={14} />
          ทำเลตัวอย่างใกล้ MTR {h.station}
        </p>
        <div className="hotel-price">
          <Price amount={h.price} currency={currency} />
          <small> / ห้อง / คืน</small>
          <span className="price-hint">ราคารวมค่าธรรมเนียมสาธิต</span>
        </div>
      </div>
    </article>
  );
}
const demoMapLocations = [
  [
    [114.1722, 22.2988],
    [114.1695, 22.2932],
    [114.1702, 22.2968],
  ],
  [
    [114.1694, 22.2933],
    [114.1588, 22.2849],
    [114.1455, 22.2759],
  ],
  [
    [114.1181, 22.3228],
    [114.1673, 22.3095],
    [114.1747, 22.3019],
  ],
  [
    [114.1694, 22.2933],
    [114.1722, 22.2988],
    [114.157, 22.289],
  ],
];
let lastRouteRequestAt = 0;

function MapPreview({ items, day }) {
  const [activeStop, setActiveStop] = useState(0);
  const [mapStatus, setMapStatus] = useState("loading");
  const [routeMode, setRouteMode] = useState("walk");
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeSummary, setRouteSummary] = useState(null);
  const [busBubbles, setBusBubbles] = useState([]);
  const [busRouteCount, setBusRouteCount] = useState(0);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapLibraryRef = useRef(null);
  const locations = demoMapLocations[day] || demoMapLocations[0];
  const markers = items
    .map((item, index) => ({
      item,
      index,
      coordinates: item[4] || locations[index],
      verifiedLocation: Boolean(item[4]),
    }))
    .filter(({ index, verifiedLocation }) => index < 3 || verifiedLocation);
  const visible = markers.map(({ item }) => item);
  const selected = visible[activeStop] || visible[0];
  const mtrUrl =
    markers.length > 1 &&
    markers[0].verifiedLocation &&
    markers.at(-1).verifiedLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${markers[0].coordinates[1]},${markers[0].coordinates[0]}&destination=${markers[markers.length - 1].coordinates[1]},${markers[markers.length - 1].coordinates[0]}&travelmode=transit`
      : null;

  useEffect(() => {
    let disposed = false;
    let map;
    let mapLoaded = false;
    const startMap = async () => {
      try {
        const maplibregl = await import(
          /* @vite-ignore */ "https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs"
        );
        if (disposed || !containerRef.current) return;

        mapLibraryRef.current = maplibregl;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [114.1694, 22.2933],
          zoom: 13,
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
        map.on("load", () => {
          if (disposed) return;
          mapLoaded = true;
          setMapStatus("ready");
          const coordinates = markers.map((marker) => marker.coordinates);
          map.addSource("day-plan-real", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "day-plan-route-real",
            type: "line",
            source: "day-plan-real",
            paint: {
              "line-color": "#ca5e15",
              "line-width": 4,
              "line-opacity": 0.9,
              "line-cap": "round",
              "line-join": "round",
            },
          });
          map.addSource("day-plan-demo", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "day-plan-route-demo",
            type: "line",
            source: "day-plan-demo",
            paint: {
              "line-color": "#ca5e15",
              "line-width": 4,
              "line-opacity": 0.78,
              "line-dasharray": [1.5, 1.5],
              "line-cap": "round",
              "line-join": "round",
            },
          });
          map.addSource("day-plan-bus", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "day-plan-route-bus",
            type: "line",
            source: "day-plan-bus",
            paint: {
              "line-color": "#246fba",
              "line-width": 5,
              "line-opacity": 0.92,
              "line-dasharray": [2, 1.2],
              "line-cap": "round",
              "line-join": "round",
            },
          });

          markers.forEach(({ item, index, coordinates }) => {
            const pin = document.createElement("button");
            pin.type = "button";
            pin.className = `map-pin ${index === 0 ? "selected" : ""}`;
            pin.textContent = String(index + 1);
            pin.setAttribute("aria-label", `จุดที่ ${index + 1}: ${item[1]}`);
            pin.setAttribute("aria-pressed", String(index === 0));
            pin.addEventListener("click", () => {
              setActiveStop(index);
              containerRef.current
                ?.querySelectorAll(".map-pin")
                .forEach((node, markerIndex) => {
                  const selectedPin = markerIndex === index;
                  node.classList.toggle("selected", selectedPin);
                  node.setAttribute("aria-pressed", String(selectedPin));
                });
            });
            new maplibregl.Marker({ element: pin, anchor: "bottom" })
              .setLngLat(coordinates)
              .addTo(map);
          });

          if (coordinates.length > 1) {
            const bounds = coordinates.reduce(
              (result, coordinate) => result.extend(coordinate),
              new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
            );
            map.fitBounds(bounds, {
              padding: { top: 48, right: 34, bottom: 148, left: 34 },
              maxZoom: 14,
              duration: 0,
            });
          }
        });
        map.on("error", () => {
          if (!disposed && !mapLoaded) setMapStatus("error");
        });
      } catch {
        if (!disposed) setMapStatus("error");
      }
    };

    setMapStatus("loading");
    startMap();
    return () => {
      disposed = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [day, items]);

  useEffect(() => {
    if (mapStatus !== "ready") return;
    let disposed = false;
    const map = mapRef.current;
    const realSource = map?.getSource("day-plan-real");
    const demoSource = map?.getSource("day-plan-demo");
    const busSource = map?.getSource("day-plan-bus");
    if (!map || !realSource || !demoSource || !busSource) return;

    realSource.setData({ type: "FeatureCollection", features: [] });
    demoSource.setData({ type: "FeatureCollection", features: [] });
    busSource.setData({ type: "FeatureCollection", features: [] });
    const routeColor = routeMode === "walk" ? "#ca5e15" : "#246fba";
    map.setPaintProperty("day-plan-route-real", "line-color", routeColor);
    map.setPaintProperty("day-plan-route-demo", "line-color", routeColor);
    setRouteSummary(null);
    if (routeMode === "transit") {
      setRouteStatus("transit");
      return () => {
        disposed = true;
      };
    }
    if (routeMode === "bus") {
      setBusBubbles([]);
      if (markers.length < 2) {
        setRouteStatus("need-location");
        return () => {
          disposed = true;
        };
      }
      setRouteStatus("bus-loading");
      findKmbRoutes(markers[0].coordinates, markers.at(-1).coordinates)
        .then(({ direct, nearby }) => {
          if (disposed) return;
          setBusRouteCount(direct.length || nearby.length);
          const nearbyBubbles = ["ต้นทาง", "ปลายทาง"].flatMap((kind) => {
            const options = nearby
              .filter((route) => route.kind === kind)
              .slice(0, 3);
            return options.length
              ? [
                  {
                    ...options[0],
                    route: options.map((option) => option.route).join(" · "),
                    board: kind === "ต้นทาง" ? options[0].board : "",
                    destinationName:
                      kind === "ปลายทาง"
                        ? options[0].destinationName || options[0].alight
                        : "",
                  },
                ]
              : [];
          });
          setBusBubbles(direct.length ? direct.slice(0, 1) : nearbyBubbles);
          setRouteStatus(
            direct.length
              ? "bus-ready"
              : nearby.length
                ? "bus-nearby"
                : "bus-empty",
          );
          if (direct[0]?.path?.length > 1) {
            (async () => {
              try {
                const path =
                  direct[0].path.length > 95
                    ? direct[0].path.filter(
                        (_, index) =>
                          index % Math.ceil(direct[0].path.length / 95) === 0 ||
                          index === direct[0].path.length - 1,
                      )
                    : direct[0].path;
                const wait = Math.max(
                  0,
                  1050 - (Date.now() - lastRouteRequestAt),
                );
                if (wait)
                  await new Promise((resolve) => setTimeout(resolve, wait));
                if (disposed) return;
                lastRouteRequestAt = Date.now();
                const coordinates = path
                  .map((point) => point.join(","))
                  .join(";");
                const response = await fetch(
                  `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
                );
                if (!response.ok) throw new Error("bus path");
                const result = await response.json();
                const geometry = result.routes?.[0]?.geometry;
                if (!geometry?.coordinates?.length || disposed) return;
                busSource.setData({
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      properties: { route: direct[0].route },
                      geometry,
                    },
                  ],
                });
              } catch {
                // Keep official stop bubbles visible if the optional road shape is unavailable.
              }
            })();
          }
        })
        .catch(() => {
          if (!disposed) setRouteStatus("bus-error");
        });
      return () => {
        disposed = true;
      };
    }
    setBusBubbles([]);

    const routePairs = markers.slice(0, -1).flatMap((marker, index) => {
      const next = markers[index + 1];
      return next
        ? [[marker, next, !marker.verifiedLocation || !next.verifiedLocation]]
        : [];
    });
    if (!routePairs.length) {
      setRouteStatus("need-location");
      return () => {
        disposed = true;
      };
    }

    setRouteStatus("loading");
    (async () => {
      try {
        const realFeatures = [];
        const demoFeatures = [];
        let distance = 0;
        let duration = 0;
        let hasDemoCoordinates = false;
        for (const [from, to, isDemo] of routePairs) {
          if (disposed) return;
          const wait = Math.max(0, 1050 - (Date.now() - lastRouteRequestAt));
          if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
          if (disposed) return;
          lastRouteRequestAt = Date.now();
          const profile = routeMode === "walk" ? "routed-foot" : "routed-car";
          const path = `${from.coordinates.join(",")};${to.coordinates.join(",")}`;
          const response = await fetch(
            `https://routing.openstreetmap.de/${profile}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`,
          );
          if (!response.ok) throw new Error("route");
          const result = await response.json();
          const route = result.routes?.[0];
          if (!route?.geometry?.coordinates?.length) throw new Error("route");
          (isDemo ? demoFeatures : realFeatures).push({
            type: "Feature",
            properties: {
              from: from.item[1],
              to: to.item[1],
              estimatedEndpoints: isDemo,
            },
            geometry: route.geometry,
          });
          hasDemoCoordinates ||= isDemo;
          distance += route.distance || 0;
          duration += route.duration || 0;
        }
        if (disposed) return;
        realSource.setData({
          type: "FeatureCollection",
          features: realFeatures,
        });
        demoSource.setData({
          type: "FeatureCollection",
          features: demoFeatures,
        });
        setRouteSummary({
          distance,
          duration,
          estimatedEndpoints: hasDemoCoordinates,
        });
        setRouteStatus("ready");
      } catch {
        if (!disposed) setRouteStatus("error");
      }
    })();
    return () => {
      disposed = true;
    };
  }, [routeMode, day, items, mapStatus]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibraryRef.current;
    if (!map || !maplibregl || mapStatus !== "ready" || routeMode !== "bus")
      return;
    const markersOnMap = busBubbles.flatMap((route) =>
      route.coordinate
        ? [
            {
              coordinates: route.coordinate,
              routeNumber: route.route,
              stopName:
                route.kind === "ต้นทาง" ? route.board : route.destinationName,
              kind: route.kind,
            },
          ]
        : [
            {
              coordinates: route.origin,
              routeNumber: route.route,
              stopName: route.board,
              kind: "ขึ้น",
            },
            {
              coordinates: route.destination,
              routeNumber: route.route,
              stopName: route.alight,
              kind: "ลง",
            },
          ],
    );
    const instances = markersOnMap.map((stop, index) => {
      const element = document.createElement("div");
      element.className = "bus-route-bubble";
      element.style.zIndex = "12";
      element.style.translate = `${index === 0 ? -120 : 120}px 0px`;
      element.setAttribute("role", "note");
      element.innerHTML = `<span class="bus-route-bubble-line"><span class="bus-route-bubble-icon"></span><strong></strong></span><span class="bus-route-bubble-stop"></span>`;
      element.querySelector(".bus-route-bubble-icon").textContent = stop.kind;
      element.querySelector(".bus-route-bubble-line strong").textContent =
        stop.routeNumber;
      element.querySelector(".bus-route-bubble-stop").textContent =
        stop.stopName;
      return new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat(stop.coordinates)
        .addTo(map);
    });
    return () => instances.forEach((marker) => marker.remove());
  }, [busBubbles, mapStatus, routeMode]);

  return (
    <section className="plan-map" aria-label="แผนที่สรุปกิจกรรม">
      <div className="plan-map-heading">
        <span>แผนที่วัน {day + 1}</span>
        <small>แตะหมุดเพื่อดูจุดหมาย</small>
      </div>
      <div
        className="map-route-modes"
        role="group"
        aria-label="เลือกวิธีเดินทาง"
      >
        {[
          { id: "walk", icon: Footprints, label: "เดิน" },
          { id: "car", icon: Navigation, label: "รถยนต์" },
          { id: "bus", icon: BusFront, label: "รถบัส" },
          { id: "transit", icon: TrainFront, label: "MTR" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={routeMode === id ? "selected" : ""}
            aria-pressed={routeMode === id}
            onClick={() => {
              setRouteMode(id);
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <div
        className={`map-art ${routeMode === "bus" ? "showing-bus-routes" : ""}`}
      >
        <div
          className="maplibre-canvas"
          ref={containerRef}
          aria-label="แผนที่ OpenFreeMap ของฮ่องกง"
        />
        {mapStatus === "loading" && (
          <div className="map-status" role="status">
            กำลังโหลดแผนที่…
          </div>
        )}
        {mapStatus === "error" && (
          <div className="map-status map-status-error" role="status">
            โหลดแผนที่ไม่สำเร็จ ลองเชื่อมต่ออินเทอร์เน็ตแล้วเปิดหน้านี้อีกครั้ง
          </div>
        )}
        {selected && mapStatus === "ready" && routeMode !== "bus" && (
          <div
            key={`${day}-${activeStop}`}
            className="map-stop-card"
            aria-live="polite"
          >
            <span className="map-stop-kicker">
              <Sparkles size={14} aria-hidden="true" />
              {selected[0]} · จุดที่ {activeStop + 1}
            </span>
            <strong>{selected[1]}</strong>
            <small>{selected[2]}</small>
          </div>
        )}
      </div>
      <div className="map-route-feedback" role="status" aria-live="polite">
        {routeStatus === "loading" && (
          <span>กำลังคำนวณเส้นทางจากตำแหน่งที่เลือก…</span>
        )}
        {routeStatus === "ready" && routeSummary && (
          <span>
            <strong>
              {routeSummary.estimatedEndpoints
                ? "เส้นประ · ตำแหน่งตัวอย่าง"
                : routeMode === "walk"
                  ? "เส้นทางเดิน"
                  : "เส้นทางรถ"}
            </strong>{" "}
            · {(routeSummary.distance / 1000).toFixed(1)} กม. · ประมาณ{" "}
            {Math.max(1, Math.round(routeSummary.duration / 60))} นาที
          </span>
        )}
        {(routeStatus === "need-location" || routeStatus === "idle") && (
          <span>
            {markers.length < 2
              ? "เพิ่มจุดหมายอีกหนึ่งจุดเพื่อดูแนวเส้นทาง"
              : "ยังไม่มีถนนเชื่อมระหว่างจุดหมายนี้"}
          </span>
        )}
        {routeStatus === "error" && (
          <span>
            บริการคำนวณเส้นทางชั่วคราวไม่ตอบสนอง ลองใหม่อีกครั้งภายหลัง
          </span>
        )}
        {routeStatus === "transit" && (
          <span className="map-transit-note">
            {mtrUrl
              ? "เส้นทาง MTR พร้อมสถานีและสายที่แนะนำ"
              : "ปักหมุดต้นทางและปลายทางจริง เพื่อดูสถานีและสาย MTR"}
            {mtrUrl && (
              <a href={mtrUrl} target="_blank" rel="noreferrer">
                ดูสายและสถานี <ExternalLink size={13} />
              </a>
            )}
          </span>
        )}
        {routeStatus === "bus-loading" && (
          <span>กำลังค้นหาป้ายและสายรถ KMB จากข้อมูลเปิดทางการ…</span>
        )}
        {routeStatus === "bus-ready" && (
          <span className="map-transit-note">
            {markers[0]?.verifiedLocation && markers.at(-1)?.verifiedLocation
              ? ""
              : "พิกัดสถานที่ยังเป็นตัวอย่าง · "}
            พบ {busRouteCount} สาย KMB ที่ไปถึงได้โดยตรง · แสดงสายแนะนำบนแผนที่
            · เส้นประคือแนวถนนประมาณตามลำดับป้าย
          </span>
        )}
        {routeStatus === "bus-nearby" && (
          <span className="map-transit-note">
            {markers[0]?.verifiedLocation && markers.at(-1)?.verifiedLocation
              ? ""
              : "พิกัดสถานที่ยังเป็นตัวอย่าง · "}
            ไม่มีสายตรงที่เชื่อมสองจุด · bubble รวมสาย KMB ใกล้ต้นทางและปลายทาง
            อาจต้องต่อรถ
          </span>
        )}
        {routeStatus === "bus-empty" && (
          <span>
            ไม่พบสาย KMB ตรงระหว่างสองจุดนี้ · ลองขยับหมุดให้ใกล้ป้ายรถ
          </span>
        )}
        {routeStatus === "bus-error" && (
          <span>โหลดข้อมูล KMB ไม่สำเร็จ · ตรวจอินเทอร์เน็ตแล้วลองใหม่</span>
        )}
      </div>
      <p className="map-disclaimer">
        พื้นที่แผนที่จาก OpenFreeMap · © OpenStreetMap contributors
        <br />
        หมุดที่ยังไม่ปักเป็นตัวอย่าง · เส้นประอิงพิกัดตัวอย่าง ·
        เส้นทึบอิงตำแหน่งที่เลือกจริง
        {routeMode === "bus" && (
          <>
            {" "}
            · สายรถจาก{" "}
            <a
              href="https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb"
              target="_blank"
              rel="noreferrer"
            >
              Transport Department / KMB
            </a>
          </>
        )}
        {items.length > markers.length
          ? ` · แสดง ${markers.length} จาก ${items.length} จุด`
          : ""}
      </p>
    </section>
  );
}

export function App() {
  const [path, setPath] = useState(location.hash.slice(1).split("?")[0] || "/");
  const [currency, setCurrency] = useSaved("ezytrip:currency", "HKD"),
    [query, setQuery] = useSaved("ezytrip:query", initialQuery),
    [saved, setSaved] = useSaved("ezytrip:saved", []),
    [expenses, setExpenses] = useSaved("ezytrip:expenses", []),
    [days, setDays] = useSaved("ezytrip:days", initialDays),
    [day, setDay] = useSaved("ezytrip:day", 0),
    [permission, setPermission] = useSaved("ezytrip:permission", "everyone");
  const [sheet, setSheet] = useState(null),
    [toast, setToast] = useState(""),
    [tab, setTab] = useState("plan"),
    [area, setArea] = useState("all"),
    [max, setMax] = useState(1500),
    [sort, setSort] = useState("recommend");
  useEffect(() => {
    const listener = () => {
      setPath(location.hash.slice(1).split("?")[0] || "/");
      setSheet(null);
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const save = (id) => {
    setSaved((previous) =>
      previous.includes(id)
        ? previous.filter((x) => x !== id)
        : [...previous, id],
    );
    setToast(
      saved.includes(id) ? "นำที่พักออกแล้ว" : "บันทึกที่พักเข้าทริปแล้ว",
    );
  };
  const openTrip = (t) => {
    setTab(t);
    go("/trip");
  };
  const nights = nightsBetween(query.checkin, query.checkout) || 3;
  const selected = hotels.find((h) => path === "/stay/" + h.id);
  const results = hotels
    .filter(
      (h) =>
        (area === "all" || h.area === area) &&
        h.price <= max &&
        (!query.budget ||
          budgetAmount(
            h.price,
            query.unit,
            nights,
            query.guests,
            query.rooms,
          ) <=
            Number(query.budget) /
              ((query.budgetCurrency || "HKD") === "THB" ? RATE : 1)) &&
        /ฮ่องกง|hong kong|香港/i.test(query.destination.trim()),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "rating"
          ? b.rating - a.rating
          : 0,
    );
  const items = [
    { url: "/", text: "หน้าแรก", icon: House },
    { url: "/trips", text: "ทริปของฉัน", icon: Route },
    { url: "/search", text: "ที่พัก", icon: BedDouble },
  ];
  const active = (url) =>
    url === "/"
      ? path === "/"
      : url === "/search"
        ? path === "/search" || path === "/stays" || path.startsWith("/stay/")
        : url === "/trips"
          ? path === "/trips" ||
            path === "/account" ||
            path === "/join" ||
            path === "/trip" ||
            /^\/trip\/[0-9a-f-]{36}$/i.test(path)
          : false;
  const cloudTripMatch = path.match(/^\/trip\/([0-9a-f-]{36})$/i);
  const sharedPage =
    path === "/account"
      ? "account"
      : path === "/join"
        ? "join"
        : cloudTripMatch
          ? "trip"
          : "trips";
  const resetDemoData = () => {
    try {
      clearDemoData(localStorage, () => true);
      setCurrency("HKD");
      setQuery(initialQuery);
      setSaved([]);
      setExpenses([]);
      setDays(initialDays);
      setDay(0);
      setPermission("everyone");
      setToast("รีเซ็ตข้อมูลตัวอย่างแล้ว");
    } catch (error) {
      setToast(error.message || "รีเซ็ตข้อมูลตัวอย่างไม่สำเร็จ");
    }
  };
  const cards = (list) => (
    <div className="hotel-grid">
      {list.map((h) => (
        <Hotel
          key={h.id}
          hotel={h}
          currency={currency}
          saved={saved.includes(h.id)}
          onSave={save}
        />
      ))}
    </div>
  );
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        ข้ามไปเนื้อหา
      </a>
      <header className="app-header">
        <a href="#/" className="brand">
          <Compass />
          <span>
            ezytrip<span className="accent">.</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="เมนูหลัก">
          {items.map((n) => (
            <a
              className={active(n.url) ? "active" : ""}
              href={"#" + n.url}
              key={n.url}
            >
              {n.text}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <Currency currency={currency} setCurrency={setCurrency} />
          <button
            className="avatar"
            aria-label="บัญชีผู้ใช้"
            onClick={() => go("/account")}
          >
            ค
          </button>
        </div>
      </header>
      <main
        id="main"
        tabIndex="-1"
        className={"main " + (path === "/" ? "home-page" : "")}
      >
        {path === "/" && (
          <>
            <div className="page-intro">
              <div>
                <p className="eyebrow">แผนเที่ยวของคุณ เริ่มที่นี่</p>
                <h1>
                  วางทริปให้เที่ยวได้เต็มที่<span className="accent">.</span>
                </h1>
              </div>
              <span className="demo-badge">ทริปตัวอย่าง</span>
            </div>
            <div className="home-grid">
              <section className="trip-cover">
                <img
                  src="/assets/hong-kong.jpg"
                  alt="วิวอ่าว Victoria Harbour ฮ่องกง"
                />
                <div className="cover-shade" />
                <div className="trip-cover-content">
                  <span className="cover-chip">
                    <MapPin size={12} />
                    ทริปที่กำลังจะไป
                  </span>
                  <h2>Hong Kong</h2>
                  <p>
                    28 พ.ย. – 1 ธ.ค. 2026 <span>4 วัน 3 คืน</span>
                  </p>
                  <div className="cover-bottom">
                    <span className="members">
                      <b>ค</b>
                      <b>A</b>
                      <b>B</b>
                      <small>สมาชิกตัวอย่าง 3 คน</small>
                    </span>
                    <button
                      className="cover-open"
                      aria-label="เปิดแผนทริปฮ่องกง"
                      onClick={() => openTrip("plan")}
                    >
                      <span>เปิดแผนทริป</span>
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
              </section>
              <section className="home-day" aria-label="สรุปแผนรายวัน">
                <div className="home-day-heading">
                  <span>แผนรายวัน · {days[day].date}</span>
                  <CalendarDays size={19} />
                </div>
                <h2>{days[day].title}</h2>
                <ol>
                  {days[day].items.slice(0, 3).map(([time, title]) => (
                    <li key={`${time}-${title}`}>
                      <time>{time}</time>
                      <span>{title}</span>
                    </li>
                  ))}
                </ol>
                <button
                  className="home-day-link"
                  onClick={() => openTrip("plan")}
                >
                  ดูแผนและแก้ไข
                  <ArrowUpRight size={17} />
                </button>
              </section>
            </div>
            <section className="home-tools">
              <div className="section-heading">
                <h2>เครื่องมือสำหรับทริป</h2>
                <span>หยิบใช้เมื่อจำเป็น</span>
              </div>
              <div className="quick-grid">
                {[
                  [
                    ArrowLeftRight,
                    "แปลงเงิน",
                    "HKD ⇄ THB",
                    "mint",
                    () => setSheet("convert"),
                  ],
                  [
                    Utensils,
                    "หารค่าอาหาร",
                    "มื้อนี้ ใครจ่ายเท่าไร",
                    "peach",
                    () => setSheet("meal"),
                  ],
                  [
                    Navigation,
                    "หาเส้นทาง",
                    "เลือกวิธีเดินทาง",
                    "blue",
                    () => setSheet("route"),
                  ],
                  [
                    CloudSun,
                    "ดูอากาศ",
                    "ก่อนออกเดินทาง",
                    "sand",
                    () => openTrip("weather"),
                  ],
                ].map(([Icon, title, caption, color, action]) => (
                  <button key={title} onClick={action}>
                    <span className={"tool-icon " + color}>
                      <Icon />
                    </span>
                    <strong>{title}</strong>
                    <small>{caption}</small>
                  </button>
                ))}
              </div>
            </section>
            <a className="optional-stay" href="#/search">
              <BedDouble size={20} />
              <span>
                <strong>มองหาที่พักด้วยไหม?</strong>
                <small>ค้นหาและบันทึกตัวเลือกไว้ในทริปเมื่อพร้อม</small>
              </span>
              <ChevronRight size={18} />
            </a>
            <Demo />
          </>
        )}
        {path === "/search" && (
          <>
            <Heading
              title="หาที่พักที่ใช่"
              subtitle="ใกล้ที่อยากไป ในงบที่สบายใจ"
            />
            <SearchForm
              query={query}
              currency={currency}
              onSearch={(form) => {
                setQuery(form);
                setArea("all");
                setMax(1500);
                go("/stays");
              }}
            />
            <div className="quiet-panel">
              <Route />
              <div>
                <strong>ให้แผนเที่ยวช่วยเลือกที่พัก</strong>
                <p>
                  ใช้จุดหมายในทริปประกอบการแนะนำทำเล
                  แต่ละแห่งมีเหตุผลให้เปรียบเทียบ
                </p>
              </div>
            </div>
            <Demo />
          </>
        )}
        {path === "/stays" && (
          <>
            <Heading
              title="พักใกล้ทริปของคุณ"
              subtitle={`${query.destination} · ${nights} คืน · ${query.guests} คน · ${query.rooms} ห้อง`}
              back="/search"
            />
            <button className="search-summary" onClick={() => go("/search")}>
              <Search size={17} />
              <span>
                {query.checkin} — {query.checkout}
              </span>
              <span className="edit-link">แก้ไข</span>
            </button>
            <div className="results-controls">
              <button
                className="filter-button"
                onClick={() => setSheet("filter")}
              >
                <SlidersHorizontal size={16} />
                ตัวกรอง
              </button>
              <label>
                <span className="sr-only">เรียงลำดับ</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recommend">แนะนำตามแผน</option>
                  <option value="price">ราคาต่ำไปสูง</option>
                  <option value="rating">คะแนนสูงสุด</option>
                </select>
              </label>
              <span>{results.length} ที่พักสาธิต</span>
            </div>
            {cards(results)}
            {!results.length && (
              <Empty
                title="ยังไม่มีที่พักตรงกับเงื่อนไข"
                text="รุ่นทดลองมีข้อมูลเฉพาะฮ่องกง ลองเพิ่มงบหรือเปลี่ยนตัวกรอง"
                action={() => {
                  setQuery(initialQuery);
                  setArea("all");
                  setMax(1500);
                }}
                label="ล้างเงื่อนไข"
              />
            )}
            <Demo />
          </>
        )}
        {selected && (
          <>
            <Heading title="รายละเอียดที่พัก" back="/stays" />
            <div className="detail-layout">
              <section>
                <img
                  className="detail-photo"
                  src={"/assets/" + selected.image}
                  alt="ภาพห้องพักประกอบ ไม่ใช่โรงแรมจริง"
                />
                <div className="detail-heading">
                  <div>
                    <p className="eyebrow">{selected.area} · Hong Kong</p>
                    <h1>{selected.name}</h1>
                  </div>
                  <button
                    className={
                      "icon-btn " + (saved.includes(selected.id) ? "liked" : "")
                    }
                    aria-label="บันทึกที่พักนี้"
                    onClick={() => save(selected.id)}
                  >
                    <Heart
                      fill={
                        saved.includes(selected.id) ? "currentColor" : "none"
                      }
                    />
                  </button>
                </div>
                <div className="review-line">
                  <b>{selected.rating}</b>
                  <span>รีวิวสาธิต · {selected.reviews} รายการ</span>
                </div>
                <div className="recommend-note">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>ทำไมที่นี่เข้ากับทริป</strong>
                    <p>{selected.reason}</p>
                  </div>
                </div>
                <h2 className="section-title">พักแบบไหน</h2>
                <p className="body-copy">
                  ที่พักตัวอย่างสำหรับคนที่อยากออกไปสำรวจเมือง
                  แล้วกลับมาพักสบายๆ ในย่าน {selected.area}{" "}
                  ใช้เพื่อทดลองการค้นหาและจัดแผนเท่านั้น
                </p>
                <div className="amenities">
                  <span>
                    <Check size={14} />
                    Wi-Fi
                  </span>
                  <span>
                    <TrainFront size={14} />
                    ใกล้รถไฟฟ้า
                  </span>
                  <span>
                    <Check size={14} />
                    ยกเลิกได้*
                  </span>
                </div>
                <p className="micro">
                  ชื่อโรงแรม ราคา รีวิว และเงื่อนไขทั้งหมดเป็นข้อมูลสมมติ
                  ภาพประกอบจาก Unsplash ไม่ใช่โรงแรมจริง
                </p>
              </section>
              <aside className="offers">
                <div className="section-heading">
                  <h2>เทียบก่อนตัดสินใจ</h2>
                  <Currency currency={currency} setCurrency={setCurrency} />
                </div>
                <p className="stay-summary">
                  {nights} คืน · {query.guests} คน · {query.rooms} ห้อง
                </p>
                <label className="field">
                  แสดงงบ
                  <select
                    value={query.unit}
                    onChange={(e) =>
                      setQuery({ ...query, unit: e.target.value })
                    }
                  >
                    <option value="room">ต่อห้อง / คืน</option>
                    <option value="person">ต่อคน / คืน</option>
                    <option value="trip">รวมทั้งทริป</option>
                  </select>
                </label>
                {[
                  {
                    name: "Booking.com",
                    extra: 0,
                    url: `https://www.booking.com/searchresults.html?ss=Hong+Kong&checkin=${query.checkin}&checkout=${query.checkout}&group_adults=${query.guests}&no_rooms=${query.rooms}`,
                  },
                  { name: "Agoda", extra: 40, url: "https://www.agoda.com/" },
                ].map((p) => (
                  <div className="offer" key={p.name}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>ข้อเสนอเปรียบเทียบตัวอย่าง</small>
                    </div>
                    <Price
                      amount={budgetAmount(
                        selected.price + p.extra,
                        query.unit,
                        nights,
                        query.guests,
                        query.rooms,
                      )}
                      currency={currency}
                    />
                    <p>รวมค่าธรรมเนียมสาธิต · ยกเลิกได้ตามเงื่อนไขตัวอย่าง</p>
                    <a
                      className="outbound"
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ค้นหาที่ {p.name}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    if (!saved.includes(selected.id))
                      setSaved([...saved, selected.id]);
                    setToast("บันทึกที่พักเข้าทริปแล้ว");
                    openTrip("stays");
                  }}
                >
                  <Plus size={18} />
                  บันทึกเข้าทริป
                </Button>
                <p className="micro">
                  เปิดเว็บต้นทางเพื่อตรวจราคาและจองจริง · Agoda เปิดหน้าแรก
                  ไม่รับชำระเงินใน ezytrip
                </p>
              </aside>
            </div>
            <Demo />
          </>
        )}
        {path === "/trip" && (
          <>
            <div className="trip-title">
              <div>
                <p className="eyebrow">4 วัน 3 คืน · 28 พ.ย. – 1 ธ.ค. 2026</p>
                <h1>
                  ฮ่องกงของเรา<span className="accent">.</span>
                </h1>
              </div>
              <button
                className="icon-btn bordered"
                aria-label="ตั้งค่าสิทธิ์สมาชิก"
                onClick={() => setSheet("permissions")}
              >
                <Settings size={19} />
              </button>
            </div>
            <p className="trip-lead">
              เลือกวัน ดูกิจกรรม แล้วปรับแผนให้เป็นของคุณ
            </p>
            <div className="trip-members">
              <span className="members dark">
                <b>ค</b>
                <b>A</b>
                <b>B</b>
                <small>สมาชิกตัวอย่าง</small>
              </span>
              <button
                className="text-button"
                onClick={() => setSheet("invite")}
              >
                <Link size={15} />
                ชวนเพื่อน
              </button>
            </div>
            <div className="trip-tabs" role="tablist" aria-label="ส่วนของทริป">
              {[
                ["plan", "แผนเที่ยว"],
                ["expenses", "ค่าใช้จ่าย"],
                ["stays", "ที่พัก"],
                ["weather", "อากาศ"],
              ].map(([id, text]) => (
                <button
                  role="tab"
                  aria-selected={tab === id}
                  key={id}
                  onClick={() => setTab(id)}
                >
                  {text}
                  {id === "stays" && saved.length > 0 && <i>{saved.length}</i>}
                </button>
              ))}
            </div>
            {tab === "plan" && (
              <>
                <div className="days">
                  {days.map((d, i) => (
                    <button
                      key={d.date}
                      className={day === i ? "selected" : ""}
                      aria-pressed={day === i}
                      onClick={() => setDay(i)}
                    >
                      <small>{d.weekday}</small>
                      <strong>{d.date}</strong>
                    </button>
                  ))}
                </div>
                <MapPreview key={day} day={day} items={days[day].items} />
                <section
                  className="itinerary-card playful-plan"
                  aria-label="แผนเที่ยวรายวัน"
                >
                  <div className="day-focus">
                    <span className="day-sticker" aria-hidden="true"><Sparkles size={24} /></span>
                    <div>
                      <span>
                        วันที่ {day + 1} · {days[day].items.length} กิจกรรม
                        {days[day].items.length > 0 &&
                          ` · ${days[day].items[0][0]}–${days[day].items[days[day].items.length - 1][0]}`}
                      </span>
                      <h2>{days[day].title}</h2>
                    </div>
                    <button
                      className="day-add"
                      onClick={() => setSheet("place")}
                    >
                      <Plus size={17} />
                      เพิ่มจุดหมาย
                    </button>
                  </div>
                  <div className="plan-tools">
                    <span>จุดแวะวันนี้ ✦</span>
                    <button
                      className="text-button"
                      onClick={() => setSheet("route")}
                    >
                      <Route size={16} />
                      จัดเส้นทาง
                    </button>
                  </div>
                  <div className="timeline">
                    {days[day].items.map(([time, title, desc, type], i) => {
                      const Icon = {
                        bed: BedDouble,
                        walk: Footprints,
                        food: Utensils,
                        ferry: Ship,
                        train: TrainFront,
                      }[type];
                      return (
                        <div className="timeline-row" key={i}>
                          <time>{time}</time>
                          <div className="timeline-marker">
                            <Icon size={17} />
                          </div>
                          <div>
                            <span className="stop-sequence">จุดที่ {i + 1}</span>
                            <h3>{title}</h3>
                            <p>{desc}</p>
                            <button
                              className="edit-place"
                              onClick={() =>
                                setSheet({ type: "place", itemIndex: i })
                              }
                            >
                              แก้ไขกิจกรรม
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="micro">
                    เวลาในตารางเป็นตัวอย่าง · เส้นประใช้ตำแหน่งประมาณ ·
                    เส้นทึบใช้ตำแหน่งที่เลือกจริง
                  </p>
                  <p className="itinerary-tip">
                    <span aria-hidden="true">✦</span>
                    แผนเปลี่ยนได้เสมอ
                    เพิ่มจุดหมายแล้วเลือกวิธีเดินทางที่เหมาะกับคุณ
                  </p>
                </section>
              </>
            )}
            {tab === "expenses" && (
              <>
                <div className="expense-total">
                  <small>ค่าใช้จ่ายที่บันทึก</small>
                  <Price
                    large
                    amount={
                      expenses
                        .filter((e) => !e.settlement)
                        .reduce((s, e) => s + e.total, 0) / 100
                    }
                    currency={currency}
                  />
                  <span>เรทสาธิต 1 HKD = 4.30 THB</span>
                  <Button onClick={() => setSheet("meal")}>
                    <Plus size={17} />
                    เพิ่มค่าอาหาร
                  </Button>
                </div>
                {!expenses.length ? (
                  <Empty
                    title="มื้อแรก เริ่มบันทึกได้เลย"
                    text="เลือกคนร่วมจ่าย ระบุคนออกเงิน แล้วดูว่าใครต้องคืนใคร"
                  />
                ) : (
                  <>
                    <h2 className="section-title">รายการในทริป</h2>
                    {expenses
                      .filter((e) => !e.settlement)
                      .map((e) => (
                        <div className="expense-row" key={e.id}>
                          <span className="tool-icon peach">
                            <Utensils size={19} />
                          </span>
                          <div>
                            <strong>{e.title}</strong>
                            <small>
                              {e.payer} ออกก่อน · {e.shares.length} คนร่วมจ่าย
                            </small>
                          </div>
                          <Price amount={e.total / 100} currency={currency} />
                        </div>
                      ))}
                    <h2 className="section-title">สรุปยอดโอนคืน</h2>
                    {!balances(expenses).length && (
                      <p className="body-copy">ไม่มีเงินค้างคืนแล้ว</p>
                    )}
                    {balances(expenses).map((t, i) => (
                      <div className="settlement" key={i}>
                        <div>
                          <strong>
                            {t.from} → {t.to}
                          </strong>
                          <small>
                            <Price
                              amount={t.amount / 100}
                              currency={currency}
                            />
                          </small>
                        </div>
                        <button
                          className="text-button"
                          onClick={() =>
                            setSheet({ type: "settle", transfer: t })
                          }
                        >
                          บันทึกการคืน
                        </button>
                      </div>
                    ))}
                    {expenses
                      .filter((e) => e.settlement)
                      .map((e) => (
                        <p key={e.id} className="settled">
                          <CheckCircle2 size={15} />
                          {e.payer} คืน {e.shares[0].name} · {e.actualCurrency}{" "}
                          {fmt(e.actualAmount)}
                        </p>
                      ))}
                  </>
                )}
              </>
            )}
            {tab === "stays" &&
              (saved.length ? (
                cards(hotels.filter((h) => saved.includes(h.id)))
              ) : (
                <Empty
                  title="เก็บที่พักที่ถูกใจไว้ตรงนี้"
                  text="กดหัวใจบนที่พัก เพื่อกลับมาเปรียบเทียบกับเพื่อน"
                  label="ค้นหาที่พัก"
                  action={() => go("/search")}
                />
              ))}
            {tab === "weather" && (
              <div className="weather-empty">
                <span className="weather-symbol">
                  <CloudSun size={46} />
                </span>
                <h2>
                  ใกล้วันเดินทาง
                  <br />
                  ค่อยมาดูอากาศกัน
                </h2>
                <p>
                  พยากรณ์ยังไม่ครอบคลุม
                  <br />
                  28 พฤศจิกายน–1 ธันวาคม 2026
                </p>
                <div className="weather-source">
                  <strong>แผนแหล่งข้อมูล</strong>
                  <p>
                    HKO สำหรับคำเตือนทางการฮ่องกง
                    <br />
                    Open-Meteo สำหรับพยากรณ์ตามพิกัด
                  </p>
                  <span>ยังไม่เชื่อม API · ไม่ได้ตรวจคำเตือนปัจจุบัน</span>
                </div>
                <a
                  className="outbound"
                  href="https://www.hko.gov.hk/en/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  เปิดเว็บไซต์ HKO
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
            <Demo />
          </>
        )}
        {["/trips", "/account", "/join"].includes(path) || cloudTripMatch ? (
          <Suspense
            fallback={
              <p className="shared-notice" role="status">
                กำลังโหลดบัญชีและทริป...
              </p>
            }
          >
            <SharedTripsRoute
              page={sharedPage}
              tripId={cloudTripMatch?.[1]}
              onMessage={setToast}
              onResetDemo={resetDemoData}
            />
          </Suspense>
        ) : null}
        {![
          "/",
          "/search",
          "/stays",
          "/trip",
          "/trips",
          "/account",
          "/join",
        ].includes(path) &&
          !selected &&
          !cloudTripMatch && (
            <Empty
              title="ไม่พบหน้านี้"
              text="กลับไปเริ่มที่หน้าแรกได้เสมอ"
              action={() => go("/")}
              label="กลับหน้าแรก"
            />
          )}
        <footer className="app-footer">
          <span>ezytrip · ไปด้วยกัน ง่ายขึ้น</span>
          <a href="/assets/sources.json" target="_blank" rel="noopener">
            ที่มาภาพ
          </a>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="เมนูมือถือ">
        {items.map(({ url, text, icon: Icon }) => (
          <a
            key={url}
            className={active(url) ? "active" : ""}
            aria-current={active(url) ? "page" : undefined}
            href={"#" + url}
          >
            <Icon size={22} />
            <span>{text}</span>
          </a>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {sheet === "filter" && (
        <Sheet title="เลือกที่พักในแบบคุณ" onClose={() => setSheet(null)}>
          <label className="field">
            ย่าน
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="all">ทุกย่าน</option>
              {hotels.map((h) => (
                <option key={h.id}>{h.area}</option>
              ))}
            </select>
          </label>
          <label className="field">
            ราคาสูงสุดต่อห้องต่อคืน: HK$ {max}
            <input
              type="range"
              min="300"
              max="1500"
              step="10"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </label>
          <Button onClick={() => setSheet(null)}>ดูผลลัพธ์</Button>
        </Sheet>
      )}
      {sheet === "convert" && (
        <Sheet title="แปลงเงินให้เห็นภาพ" onClose={() => setSheet(null)}>
          <Converter currency={currency} />
        </Sheet>
      )}
      {sheet === "meal" && (
        <Sheet title="มื้อนี้ หารยังไงดี?" onClose={() => setSheet(null)}>
          <Meal
            currency={currency}
            onSave={(e) => {
              setExpenses([...expenses, e]);
              setSheet(null);
              openTrip("expenses");
              setToast("บันทึกค่าอาหารในทริปแล้ว");
            }}
          />
        </Sheet>
      )}
      {sheet === "route" && (
        <Sheet
          title="เลือกเส้นทางที่เหมาะกับเรา"
          onClose={() => setSheet(null)}
        >
          <RouteForm />
        </Sheet>
      )}
      {sheet === "invite" && (
        <Sheet title="ชวนเพื่อนร่วมทริป" onClose={() => setSheet(null)}>
          <span className="tool-icon mint">
            <Users />
          </span>
          <p className="body-copy">
            โหมดสาธิต: ลิงก์นี้เปิดหน้าทริปได้ แต่ข้อมูลอยู่เฉพาะเบราว์เซอร์นี้
            เพื่อนยังไม่สามารถเห็นหรือแก้ข้อมูลร่วมกันจริง
          </p>
          <div className="link-box">{location.origin}/#/trip?invite=demo</div>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  location.origin + "/#/trip?invite=demo",
                );
                setToast("คัดลอกลิงก์สาธิตแล้ว");
              } catch {
                setToast("คัดลอกอัตโนมัติไม่ได้ เลือกข้อความลิงก์แทน");
              }
            }}
          >
            <Copy size={16} />
            คัดลอกลิงก์สาธิต
          </Button>
        </Sheet>
      )}
      {sheet === "permissions" && (
        <Sheet title="ใครแก้ไขแผนได้บ้าง" onClose={() => setSheet(null)}>
          <p className="micro">
            การตั้งค่าสาธิต ยังไม่มีการบังคับสิทธิ์บน server
          </p>
          {[
            ["everyone", "ทุกคนช่วยกันจัด", "สมาชิกเพิ่มและแก้ไขแผนได้"],
            ["approval", "มีผู้ยืนยันแผน", "สมาชิกเสนอ แล้วผู้จัดยืนยัน"],
          ].map(([id, title, desc]) => (
            <label className="radio-row" key={id}>
              <input
                type="radio"
                name="permission"
                checked={permission === id}
                onChange={() => setPermission(id)}
              />
              <span>
                <strong>{title}</strong>
                <small>{desc}</small>
              </span>
            </label>
          ))}
          <Button
            onClick={() => {
              setSheet(null);
              setToast("บันทึกรูปแบบสิทธิ์สาธิตแล้ว");
            }}
          >
            บันทึก
          </Button>
        </Sheet>
      )}
      {sheet === "guest" && (
        <Sheet title="เที่ยวแบบไม่ต้องสมัครก่อน" onClose={() => setSheet(null)}>
          <Users size={32} />
          <p className="body-copy">
            คุณทดลองเป็นสมาชิก “คุณ” ข้อมูลเก็บในเบราว์เซอร์นี้ ไม่ใช่บัญชีจริง
            Google login ยังไม่เปิดใช้
          </p>
          <p className="micro">หากล้างข้อมูลเบราว์เซอร์ ข้อมูลทดลองอาจหายได้</p>
          <Button onClick={() => setSheet("invite")}>
            ดูลิงก์เชิญตัวอย่าง
          </Button>
        </Sheet>
      )}
      {(sheet === "place" || sheet?.type === "place") && (
        <Sheet
          title={sheet === "place" ? "เพิ่มจุดหมาย" : "แก้ไขกิจกรรม"}
          onClose={() => setSheet(null)}
        >
          <Place
            initial={
              sheet?.type === "place" ? days[day].items[sheet.itemIndex] : null
            }
            onSave={(name, time, detail, coordinates, locationName) => {
              setDays(
                days.map((d, i) =>
                  i === day
                    ? {
                        ...d,
                        items: (sheet?.type === "place"
                          ? d.items.map((item, index) =>
                              index === sheet.itemIndex
                                ? [
                                    time,
                                    name,
                                    detail || "จุดหมายในแผน",
                                    item[3],
                                    coordinates || null,
                                    locationName || "",
                                  ]
                                : item,
                            )
                          : [
                              ...d.items,
                              [
                                time,
                                name,
                                detail || "จุดหมายในแผน",
                                "walk",
                                coordinates || null,
                                locationName || "",
                              ],
                            ]
                        ).sort((a, b) => a[0].localeCompare(b[0], "th")),
                      }
                    : d,
                ),
              );
              setSheet(null);
              setToast(
                sheet?.type === "place"
                  ? "อัปเดตกิจกรรมแล้ว"
                  : "เพิ่มจุดหมายแล้ว",
              );
            }}
          />
        </Sheet>
      )}
      {typeof sheet === "object" && sheet?.type === "settle" && (
        <Sheet title="บันทึกยอดที่คืนจริง" onClose={() => setSheet(null)}>
          <Settlement
            transfer={sheet.transfer}
            currency={currency}
            onSave={(amount, curr) => {
              const t = sheet.transfer,
                c = Math.min(
                  Math.round((amount / (curr === "THB" ? RATE : 1)) * 100),
                  t.amount,
                );
              setExpenses([
                ...expenses,
                {
                  id: Date.now(),
                  settlement: true,
                  title: "คืนเงิน",
                  payer: t.from,
                  total: c,
                  shares: [{ name: t.to, amount: c }],
                  actualCurrency: curr,
                  actualAmount: amount,
                },
              ]);
              setSheet(null);
              setToast("บันทึกยอดคืนสาธิตแล้ว");
            }}
          />
        </Sheet>
      )}
    </>
  );
}
function SearchForm({ query, currency, onSearch }) {
  const [form, setForm] = useState(() => ({
      ...query,
      budget: query.budget
        ? String(
            Number(
              (
                Number(query.budget) *
                ((query.budgetCurrency || "HKD") === "THB" ? 1 / RATE : 1) *
                (currency === "THB" ? RATE : 1)
              ).toFixed(2),
            ),
          )
        : "",
    })),
    [error, setError] = useState("");
  const previousCurrency = useRef(currency);
  useEffect(() => {
    if (previousCurrency.current !== currency) {
      const multiplier = currency === "THB" ? RATE : 1 / RATE;
      setForm((f) => ({
        ...f,
        budget: f.budget
          ? String(Number((Number(f.budget) * multiplier).toFixed(2)))
          : "",
      }));
      previousCurrency.current = currency;
    }
  }, [currency]);
  const change = (key, value) => setForm({ ...form, [key]: value });
  return (
    <form
      className="search-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nightsBetween(form.checkin, form.checkout))
          return setError("วันเช็กเอาต์ต้องอยู่หลังวันเช็กอิน");
        if (
          form.budget !== "" &&
          (!Number.isFinite(Number(form.budget)) || Number(form.budget) < 0)
        )
          return setError("กรอกงบเป็นจำนวนเงินไม่ติดลบ");
        onSearch({ ...form, budgetCurrency: currency });
      }}
    >
      <label className="field">
        อยากไปที่ไหน?
        <div className="input-icon destination-input">
          <MapPin size={18} />
          <input
            required
            value={form.destination}
            onChange={(e) => change("destination", e.target.value)}
            placeholder="เมืองหรือประเทศ"
          />
        </div>
      </label>
      <div className="field-pair">
        <label className="field">
          เช็กอิน
          <input
            required
            type="date"
            value={form.checkin}
            onChange={(e) => change("checkin", e.target.value)}
          />
        </label>
        <label className="field">
          เช็กเอาต์
          <input
            required
            type="date"
            value={form.checkout}
            min={form.checkin}
            onChange={(e) => change("checkout", e.target.value)}
          />
        </label>
      </div>
      <div className="field-pair">
        <label className="field">
          ผู้เข้าพัก
          <select
            value={form.guests}
            onChange={(e) => change("guests", +e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n} คน
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          จำนวนห้อง
          <select
            value={form.rooms}
            onChange={(e) => change("rooms", +e.target.value)}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} ห้อง
              </option>
            ))}
          </select>
        </label>
      </div>
      <h2 className="section-title">
        งบที่สบายใจ <span className="optional">ไม่จำเป็นต้องระบุ</span>
      </h2>
      <div className="field-pair">
        <label className="field">
          งบสูงสุด ({currency})
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.budget}
            onChange={(e) => change("budget", e.target.value)}
            placeholder="ไม่จำกัด"
          />
        </label>
        <label className="field">
          คิดงบแบบไหน
          <select
            value={form.unit}
            onChange={(e) => change("unit", e.target.value)}
          >
            <option value="room">ต่อห้อง / คืน</option>
            <option value="person">ต่อคน / คืน</option>
            <option value="trip">รวมทั้งทริป</option>
          </select>
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={form.recommended}
          onChange={(e) => change("recommended", e.target.checked)}
        />
        <span>
          <strong>แนะนำตามแผนเที่ยว</strong>
          <small>ใช้ทริปฮ่องกงประกอบการแนะนำทำเล</small>
        </span>
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Button type="submit">
        <Search size={18} />
        ค้นหาที่พัก
      </Button>
      <p className="micro">
        ข้อมูลสาธิตเฉพาะฮ่องกง · ผู้เข้าพัก 3 คนเป็นค่าเริ่มต้นที่แก้ได้
      </p>
    </form>
  );
}
function Converter({ currency }) {
  const [from, setFrom] = useState(currency),
    [amount, setAmount] = useState("100");
  const n = Number(amount),
    result = from === "HKD" ? n * RATE : n / RATE;
  return (
    <>
      <label className="field">
        จำนวนเงิน ({from})
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <button
        className="swap-big"
        onClick={() => {
          setAmount(String(Math.round(result * 100) / 100));
          setFrom(from === "HKD" ? "THB" : "HKD");
        }}
      >
        <ArrowLeftRight size={20} />
        สลับสกุลเงิน
      </button>
      <div className="conversion-result">
        <small>{from === "HKD" ? "THB" : "HKD"}</small>
        <strong>{n < 0 || !Number.isFinite(result) ? "—" : fmt(result)}</strong>
      </div>
      <p className="micro">
        เรทสาธิต 1 HKD = 4.30 THB ไม่ใช่เรทจริง ไม่รวมค่าธรรมเนียม
      </p>
    </>
  );
}
function Meal({ currency, onSave }) {
  const [amount, setAmount] = useState("600"),
    [fee, setFee] = useState("10"),
    [discount, setDiscount] = useState("0"),
    [selected, setSelected] = useState(people),
    [payer, setPayer] = useState("คุณ"),
    [mode, setMode] = useState("quick");
  let result, error;
  try {
    result = splitMeal(amount, fee, discount, selected, payer);
  } catch (e) {
    error = e.message;
  }
  return (
    <>
      <div className="segmented">
        <button
          className={mode === "quick" ? "active" : ""}
          onClick={() => setMode("quick")}
        >
          หารมื้อนี้
        </button>
        <button
          className={mode === "trip" ? "active" : ""}
          onClick={() => setMode("trip")}
        >
          บันทึกในทริป
        </button>
      </div>
      <div className="field-pair">
        <label className="field">
          ค่าอาหาร (HKD)
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field">
          ค่าบริการ (%)
          <input
            type="number"
            min="0"
            max="100"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        ส่วนลด (HKD)
        <input
          type="number"
          min="0"
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </label>
      <p className="label">ใครร่วมจ่ายมื้อนี้บ้าง?</p>
      <div className="person-chips">
        {people.map((p) => (
          <button
            key={p}
            className={selected.includes(p) ? "selected" : ""}
            aria-pressed={selected.includes(p)}
            onClick={() =>
              setSelected(
                selected.includes(p)
                  ? selected.filter((x) => x !== p)
                  : [...selected, p],
              )
            }
          >
            {selected.includes(p) && <Check size={14} />} {p}
          </button>
        ))}
      </div>
      {mode === "trip" && (
        <label className="field">
          ใครออกเงินก่อน
          <select value={payer} onChange={(e) => setPayer(e.target.value)}>
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      )}
      <div className="split-result">
        <span>ยอดรวม</span>
        <strong>
          {result ? (
            <Price amount={result.total / 100} currency={currency} />
          ) : (
            "—"
          )}
        </strong>
        {result?.shares.map((s) => (
          <div key={s.name}>
            <span>{s.name}</span>
            <Price amount={s.amount / 100} currency={currency} />
          </div>
        ))}
      </div>
      <p className="micro">
        หารเท่ากันเฉพาะคนที่เลือก · เศษสตางค์กระจายตามลำดับ ·
        บันทึกยอดต้นฉบับเป็น HKD เรทสาธิต 4.30
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {mode === "trip" && (
        <Button
          disabled={!result}
          onClick={() =>
            onSave({
              ...result,
              id: Date.now(),
              title: "มื้ออาหาร",
              rate: RATE,
            })
          }
        >
          บันทึกค่าอาหารในทริป
        </Button>
      )}
    </>
  );
}
function RouteForm() {
  const [mode, setMode] = useState("single"),
    [from, setFrom] = useState("Tsim Sha Tsui"),
    [to, setTo] = useState("Central"),
    [preference, setPreference] = useState("ประหยัด"),
    [show, setShow] = useState(false);
  return (
    <>
      <div className="segmented">
        <button
          className={mode === "single" ? "active" : ""}
          onClick={() => setMode("single")}
        >
          ไปจุดหมายเดียว
        </button>
        <button
          className={mode === "day" ? "active" : ""}
          onClick={() => setMode("day")}
        >
          แผนทั้งวัน
        </button>
      </div>
      <label className="field">
        ต้นทาง
        <input
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setShow(false);
          }}
        />
      </label>
      <label className="field">
        {mode === "single" ? "ปลายทาง" : "จุดหมาย คั่นด้วยจุลภาค"}
        <input
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setShow(false);
          }}
        />
      </label>
      <p className="label">อยากเดินทางแบบไหน?</p>
      <div className="person-chips">
        {["ประหยัด", "เร็ว", "เดินน้อย", "เปลี่ยนรถน้อย"].map((p) => (
          <button
            key={p}
            className={preference === p ? "selected" : ""}
            aria-pressed={preference === p}
            onClick={() => setPreference(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <Button
        disabled={!from.trim() || !to.trim()}
        onClick={() => setShow(true)}
      >
        ดูตัวอย่างเส้นทาง
      </Button>
      {show && (
        <div className="route-demo">
          <TrainFront size={22} />
          <strong>
            {from} → {to}
          </strong>
          <p>รูปแบบตัวอย่าง: เดินไปสถานี → ตรวจสายรถ → ลงใกล้ปลายทาง</p>
          <small>
            เลือกแบบ{preference} ·{" "}
            {mode === "day" ? "แผนทั้งวัน" : "จุดหมายเดียว"}
          </small>
          <p className="micro">
            ยังไม่เชื่อมระบบเส้นทาง จึงไม่ยืนยันสายรถ ราคา เวลา
            หรือการเรียงลำดับที่เหมาะที่สุด
          </p>
          <a
            className="outbound"
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from + ", Hong Kong")}&destination=${encodeURIComponent(to + ", Hong Kong")}&travelmode=transit`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ตรวจเส้นทางจริงใน Google Maps
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </>
  );
}
function Settlement({ transfer, currency, onSave }) {
  const [curr, setCurr] = useState(currency),
    [amount, setAmount] = useState(
      String(
        Number(
          ((transfer.amount / 100) * (currency === "THB" ? RATE : 1)).toFixed(
            2,
          ),
        ),
      ),
    );
  const n = Number(amount),
    equivalent = Math.round((n / (curr === "THB" ? RATE : 1)) * 100),
    valid =
      /^\d+(\.\d{1,2})?$/.test(amount) &&
      Number.isFinite(n) &&
      n > 0 &&
      equivalent > 0 &&
      equivalent <= transfer.amount;
  return (
    <>
      <p>
        {transfer.from} คืนให้ {transfer.to}
      </p>
      <label className="field">
        สกุลเงินที่จ่ายจริง
        <select
          value={curr}
          onChange={(e) => {
            setCurr(e.target.value);
            setAmount(
              String(
                Number(
                  (
                    (transfer.amount / 100) *
                    (e.target.value === "THB" ? RATE : 1)
                  ).toFixed(2),
                ),
              ),
            );
          }}
        >
          <option>HKD</option>
          <option>THB</option>
        </select>
      </label>
      <label className="field">
        ยอดที่จ่ายจริง
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <p className="micro">
        คืนบางส่วนได้ แต่ไม่เกินยอดค้าง ใช้เรทสาธิต 4.30 THB/HKD ·
        ไม่ได้โอนเงินให้จริง
      </p>
      {!valid && <p className="error">ยอดต้องมากกว่า 0 และไม่เกินยอดค้าง</p>}
      <Button disabled={!valid} onClick={() => onSave(n, curr)}>
        บันทึกการคืนเงิน
      </Button>
    </>
  );
}
