const KMB_API = "https://data.etabus.gov.hk/v1/transport/kmb";

let dailyDataPromise;
let dailyDataDate;

async function loadKmbData() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyDataPromise && dailyDataDate === today) return dailyDataPromise;
  dailyDataDate = today;
  dailyDataPromise = Promise.all([
    fetch(`${KMB_API}/stop/`).then((response) => {
      if (!response.ok) throw new Error("KMB stop list unavailable");
      return response.json();
    }),
    fetch(`${KMB_API}/route-stop/`).then((response) => {
      if (!response.ok) throw new Error("KMB route list unavailable");
      return response.json();
    }),
    fetch(`${KMB_API}/route/`).then((response) => {
      if (!response.ok) throw new Error("KMB route list unavailable");
      return response.json();
    }),
  ])
    .then(([stopsResponse, routeStopsResponse, routesResponse]) => ({
      stops: stopsResponse.data || [],
      routeStops: routeStopsResponse.data || [],
      routes: routesResponse.data || [],
    }))
    .catch((error) => {
      dailyDataPromise = undefined;
      throw error;
    });
  return dailyDataPromise;
}

const distanceMeters = (a, b) => {
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const n =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(n), Math.sqrt(1 - n));
};

function nearestStops(stops, coordinate) {
  return stops
    .map((stop) => ({
      stop,
      distance: distanceMeters(coordinate, [
        Number(stop.long),
        Number(stop.lat),
      ]),
    }))
    .filter(({ distance }) => distance <= 650)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);
}

export async function findKmbRoutes(origin, destination) {
  const { stops, routeStops, routes } = await loadKmbData();
  const stopsById = new Map(stops.map((stop) => [stop.stop, stop]));
  const originStops = nearestStops(stops, origin);
  const destinationStops = nearestStops(stops, destination);
  const originIds = new Map(
    originStops.map(({ stop, distance }) => [stop.stop, distance]),
  );
  const destinationIds = new Map(
    destinationStops.map(({ stop, distance }) => [stop.stop, distance]),
  );
  const routeGroups = new Map();

  for (const routeStop of routeStops) {
    const key = `${routeStop.route}|${routeStop.bound}|${routeStop.service_type}`;
    if (!routeGroups.has(key)) routeGroups.set(key, []);
    routeGroups.get(key).push(routeStop);
  }

  const candidates = [];
  for (const [key, sequence] of routeGroups) {
    const boarding = sequence.filter((entry) => originIds.has(entry.stop));
    const alighting = sequence.filter((entry) =>
      destinationIds.has(entry.stop),
    );
    for (const from of boarding) {
      for (const to of alighting) {
        if (Number(from.seq) >= Number(to.seq)) continue;
        const fromStop = stopsById.get(from.stop);
        const toStop = stopsById.get(to.stop);
        if (!fromStop || !toStop) continue;
        const pathStops = sequence
          .filter(
            (entry) =>
              Number(entry.seq) >= Number(from.seq) &&
              Number(entry.seq) <= Number(to.seq),
          )
          .map((entry) => stopsById.get(entry.stop))
          .filter(Boolean);
        candidates.push({
          route: from.route,
          board: fromStop.name_en || fromStop.name_tc || "ป้ายขึ้นรถ",
          alight: toStop.name_en || toStop.name_tc || "ป้ายลงรถ",
          origin: [Number(fromStop.long), Number(fromStop.lat)],
          destination: [Number(toStop.long), Number(toStop.lat)],
          path: pathStops.map((stop) => [Number(stop.long), Number(stop.lat)]),
          score:
            originIds.get(from.stop) +
            destinationIds.get(to.stop) +
            (Number(to.seq) - Number(from.seq)) * 4,
          direction: from.bound,
        });
      }
    }
  }
  const direct = candidates
    .sort((a, b) => a.score - b.score)
    .filter(
      (candidate, index, all) =>
        all.findIndex((other) => other.route === candidate.route) === index,
    )
    .slice(0, 3);
  if (direct.length) return { direct, nearby: [] };

  const routeDestinations = new Map(
    routes.map((route) => [
      `${route.route}|${route.bound}|${route.service_type}`,
      route.dest_en || route.dest_tc,
    ]),
  );
  const nearby = [
    { coordinate: origin, kind: "ต้นทาง", options: originStops },
    { coordinate: destination, kind: "ปลายทาง", options: destinationStops },
  ].flatMap(({ kind, options }) => {
    const ids = new Set(options.slice(0, 3).map(({ stop }) => stop.stop));
    const seen = new Set();
    return routeStops
      .filter((entry) => ids.has(entry.stop))
      .flatMap((entry) => {
        const key = `${kind}|${entry.route}|${entry.bound}|${entry.service_type}`;
        const stop = stopsById.get(entry.stop);
        if (seen.has(entry.route) || !stop) return [];
        seen.add(entry.route);
        return [
          {
            route: entry.route,
            board: kind === "ต้นทาง" ? stop.name_en || stop.name_tc : "",
            alight: kind === "ปลายทาง" ? stop.name_en || stop.name_tc : "",
            destinationName:
              routeDestinations.get(
                `${entry.route}|${entry.bound}|${entry.service_type}`,
              ) || "",
            coordinate: [Number(stop.long), Number(stop.lat)],
            kind,
            key,
          },
        ];
      })
      .slice(0, 3);
  });
  return { direct: [], nearby };
}
