// Shared USA map for the Regional Founders pages: an Albers USA projection (Alaska and Hawaii
// as insets) drawn as SVG, with optional zoom and region drawing.
// Depends on d3 (window.d3) and topojson-client (window.topojson).
(function () {
  const STATES_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json';
  const WIDTH = 975;
  const HEIGHT = 610;
  const EARTH_RADIUS_MI = 3958.8;

  const STATE_ABBR = {
    Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
    Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA',
    Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY',
    Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
    Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH',
    'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
    Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
    'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
    Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
    'Puerto Rico': 'PR', Guam: 'GU', 'United States Virgin Islands': 'VI', 'American Samoa': 'AS',
    'Commonwealth of the Northern Mariana Islands': 'MP',
  };

  const PATH_STYLES = {
    regional: { label: 'Regional founding', color: '#b24133' },
    provisional: { label: 'Provisional founding', color: '#3c6dcb' },
    affiliate: { label: 'Affiliate', color: '#2b9aa6' },
  };

  // ---------- geometry helpers ----------

  // Coordinates east of the antimeridian (Aleutians, Pacific territories) are shifted to negative
  // longitudes so US shapes stay contiguous on the map.
  function toMapLng(lng) {
    return lng > 0 ? lng - 360 : lng;
  }

  function polygonsOf(geometry) {
    if (!geometry) return [];
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    if (geometry.type === 'MultiPolygon') return geometry.coordinates;
    return [];
  }

  function mapGeometryCoords(geometry, fn) {
    const mapRing = (ring) => ring.map(([lng, lat]) => [fn(lng), lat]);
    if (geometry.type === 'Polygon') {
      return { type: 'Polygon', coordinates: geometry.coordinates.map(mapRing) };
    }
    if (geometry.type === 'MultiPolygon') {
      return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((poly) => poly.map(mapRing)) };
    }
    return geometry;
  }

  function ringBounds(ring) {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    ring.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    return { minX, minY, maxX, maxY };
  }

  function boundsOverlap(a, b) {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
  }

  function pointInRing([x, y], ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function pointInPolygon(point, polygon) {
    if (!pointInRing(point, polygon[0])) return false;
    for (let i = 1; i < polygon.length; i += 1) {
      if (pointInRing(point, polygon[i])) return false;
    }
    return true;
  }

  function segmentsCross(p1, p2, p3, p4) {
    const d = (a, b, c) => (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]);
    const d1 = d(p3, p4, p1);
    const d2 = d(p3, p4, p2);
    const d3 = d(p1, p2, p3);
    const d4 = d(p1, p2, p4);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function ringsCross(ringA, ringB) {
    for (let i = 0; i < ringA.length - 1; i += 1) {
      for (let j = 0; j < ringB.length - 1; j += 1) {
        if (segmentsCross(ringA[i], ringA[i + 1], ringB[j], ringB[j + 1])) return true;
      }
    }
    return false;
  }

  function polygonsIntersect(polyA, polyB) {
    const outerA = polyA[0];
    const outerB = polyB[0];
    if (!boundsOverlap(ringBounds(outerA), ringBounds(outerB))) return false;
    if (outerA.some((pt) => pointInPolygon(pt, polyB))) return true;
    if (outerB.some((pt) => pointInPolygon(pt, polyA))) return true;
    return ringsCross(outerA, outerB);
  }

  // Spherical ring area (same approach as d3-geo / turf), in square miles.
  function ringAreaSqMi(ring) {
    const rad = Math.PI / 180;
    let total = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];
      total += (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
    }
    return Math.abs((total * EARTH_RADIUS_MI * EARTH_RADIUS_MI) / 2);
  }

  function areaSqMi(geometry) {
    return polygonsOf(geometry).reduce((sum, polygon) => {
      const outer = ringAreaSqMi(polygon[0]);
      const holes = polygon.slice(1).reduce((h, ring) => h + ringAreaSqMi(ring), 0);
      return sum + outer - holes;
    }, 0);
  }

  function centroidOf(geometry) {
    const points = polygonsOf(geometry).flatMap((polygon) => polygon[0]);
    if (!points.length) return null;
    const sum = points.reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
  }

  // d3 treats a ring's winding as which side is "inside"; make every ring enclose the small side.
  function rewind(feature) {
    if (d3.geoArea(feature) <= 2 * Math.PI) return feature;
    const flip = (polygon) => polygon.map((ring) => ring.slice().reverse());
    const { geometry } = feature;
    const coordinates = geometry.type === 'Polygon'
      ? flip(geometry.coordinates)
      : geometry.coordinates.map(flip);
    return { ...feature, geometry: { ...geometry, coordinates } };
  }

  function asFeature(geometry, properties = {}) {
    return { type: 'Feature', geometry, properties };
  }

  // Ramer-Douglas-Peucker simplification on planar points.
  function simplifyPoints(points, epsilon) {
    if (points.length < 3) return points;
    const [ax, ay] = points[0];
    const [bx, by] = points[points.length - 1];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    let maxDistance = 0;
    let index = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const [px, py] = points[i];
      // A closed freehand loop starts and ends at the same spot, so fall back to distance from it.
      const distance = length < 1e-9
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / length;
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance <= epsilon) return [points[0], points[points.length - 1]];
    const left = simplifyPoints(points.slice(0, index + 1), epsilon);
    const right = simplifyPoints(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  // ---------- states data ----------

  let topologyPromise = null;
  let statesPromise = null;

  function loadTopology() {
    if (!topologyPromise) {
      topologyPromise = fetch(STATES_URL)
        .then((response) => {
          if (!response.ok) throw new Error(`States data request failed (${response.status})`);
          return response.json();
        })
        .catch((error) => {
          topologyPromise = null;
          throw error;
        });
    }
    return topologyPromise;
  }

  // State features with antimeridian-shifted longitudes, used for intersection tests.
  function loadStates() {
    if (!statesPromise) {
      statesPromise = loadTopology()
        .then((topology) => {
          const collection = topojson.feature(topology, topology.objects.states);
          collection.features = collection.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              abbr: STATE_ABBR[feature.properties.name] ?? feature.properties.name,
            },
            geometry: mapGeometryCoords(feature.geometry, toMapLng),
          }));
          return collection;
        })
        .catch((error) => {
          statesPromise = null;
          throw error;
        });
    }
    return statesPromise;
  }

  function statesTouched(geometry, states) {
    if (!geometry || !states) return [];
    const drawnPolygons = polygonsOf(mapGeometryCoords(geometry, toMapLng));
    return states.features
      .filter((state) => polygonsOf(state.geometry).some((statePoly) => (
        drawnPolygons.some((drawnPoly) => polygonsIntersect(drawnPoly, statePoly))
      )))
      .map((state) => state.properties.abbr)
      .sort();
  }

  // ---------- map ----------

  function createUsMap(element, { zoomable = false } = {}) {
    const svg = d3.select(element)
      .append('svg')
      .attr('class', 'us-map')
      .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    const root = svg.append('g');
    const statesLayer = root.append('g').attr('class', 'map-states');
    const borders = root.append('path').attr('class', 'map-borders');
    const regionsLayer = root.append('g').attr('class', 'map-regions');
    const drawLayer = root.append('g').attr('class', 'map-draw');
    const projection = d3.geoAlbersUsa();
    const path = d3.geoPath(projection);
    const zoomListeners = [];
    let transform = d3.zoomIdentity;
    let stateFeatures = [];

    const zoom = d3.zoom()
      .scaleExtent([1, 40])
      .translateExtent([[0, 0], [WIDTH, HEIGHT]])
      .clickDistance(4)
      .on('zoom', (event) => {
        transform = event.transform;
        root.attr('transform', transform);
        zoomListeners.forEach((listener) => listener(transform));
      });
    if (zoomable) svg.call(zoom);

    const ready = loadTopology().then((topology) => {
      const states = topojson.feature(topology, topology.objects.states);
      projection.fitExtent([[10, 10], [WIDTH - 10, HEIGHT - 10]], states);
      stateFeatures = states.features
        .filter((feature) => path(feature))
        .map((feature) => ({
          ...feature,
          properties: { ...feature.properties, abbr: STATE_ABBR[feature.properties.name] ?? feature.properties.name },
        }))
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
      statesLayer.selectAll('path').data(stateFeatures).join('path').attr('d', path);
      borders.attr('d', path(topojson.mesh(topology, topology.objects.states, (a, b) => a !== b)));
      return stateFeatures;
    });

    function regionPath(geometry) {
      return path(rewind(asFeature(geometry)));
    }

    function applyTransform(next, animate) {
      const target = animate ? svg.transition().duration(450) : svg;
      target.call(zoom.transform, next);
    }

    function zoomToGeometry(geometry, { maxScale = 12, padding = 0.85, animate = true } = {}) {
      const [[x0, y0], [x1, y1]] = path.bounds(rewind(asFeature(geometry)));
      if (![x0, y0, x1, y1].every(Number.isFinite)) return;
      const scale = Math.max(1, Math.min(maxScale, padding / Math.max((x1 - x0) / WIDTH, (y1 - y0) / HEIGHT)));
      const next = d3.zoomIdentity
        .translate(WIDTH / 2, HEIGHT / 2)
        .scale(scale)
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      applyTransform(next, animate);
    }

    return {
      svg,
      root,
      regionsLayer,
      drawLayer,
      path,
      projection,
      ready,
      regionPath,
      getStates: () => stateFeatures,
      getScale: () => transform.k,
      onZoom: (listener) => zoomListeners.push(listener),
      setZoomFilter: (filter) => zoom.filter(filter),
      zoomBy: (factor) => svg.transition().duration(250).call(zoom.scaleBy, factor),
      resetZoom: (animate = true) => applyTransform(d3.zoomIdentity, animate),
      zoomToGeometry,
      // Pointer position in projected (unzoomed) map coordinates.
      localPoint: (event) => d3.pointer(event, root.node()),
      invert: (point) => projection.invert(point),
      destroy: () => {
        svg.on('.zoom', null);
        svg.remove();
      },
    };
  }

  // ---------- drawing ----------

  function createDrawer(usMap, { onChange } = {}) {
    const svgNode = usMap.svg.node();
    const shapesGroup = usMap.drawLayer.append('g').attr('class', 'drawn-shapes');
    const previewGroup = usMap.drawLayer.append('g').attr('class', 'draw-preview');
    const shapes = [];
    let mode = 'pan';
    let stroke = null;
    let strokeLine = null;
    let vertices = [];

    function getGeometry() {
      if (!shapes.length) return null;
      return shapes.length === 1
        ? { type: 'Polygon', coordinates: [shapes[0]] }
        : { type: 'MultiPolygon', coordinates: shapes.map((ring) => [ring]) };
    }

    function emit() {
      if (onChange) onChange(getGeometry());
    }

    function renderShapes() {
      shapesGroup.selectAll('path')
        .data(shapes)
        .join('path')
        .attr('d', (ring) => usMap.regionPath({ type: 'Polygon', coordinates: [ring] }));
    }

    // Points outside the projection (open ocean between insets) invert to null and are dropped.
    function commit(localPoints) {
      const ring = localPoints.map((point) => usMap.invert(point)).filter(Boolean);
      if (ring.length < 3) return;
      ring.push(ring[0]);
      shapes.push(ring);
      renderShapes();
      emit();
    }

    // Freehand: press, drag, release.
    function onPointerDown(event) {
      if (mode !== 'freehand' || event.button > 0) return;
      event.preventDefault();
      svgNode.setPointerCapture?.(event.pointerId);
      stroke = [usMap.localPoint(event)];
      strokeLine = previewGroup.append('polyline').attr('class', 'draw-stroke');
    }

    function onPointerMove(event) {
      if (!stroke) return;
      const point = usMap.localPoint(event);
      const last = stroke[stroke.length - 1];
      if (Math.hypot(point[0] - last[0], point[1] - last[1]) * usMap.getScale() < 3) return;
      stroke.push(point);
      strokeLine.attr('points', stroke.map((p) => p.join(',')).join(' '));
    }

    function onPointerUp() {
      if (!stroke) return;
      const points = simplifyPoints(stroke, 1.5 / usMap.getScale());
      stroke = null;
      strokeLine.remove();
      strokeLine = null;
      commit(points);
    }

    svgNode.addEventListener('pointerdown', onPointerDown);
    svgNode.addEventListener('pointermove', onPointerMove);
    svgNode.addEventListener('pointerup', onPointerUp);
    svgNode.addEventListener('pointercancel', onPointerUp);

    // Points: click corners, click the first point (or Finish / double-click) to close.
    function renderVertices() {
      const k = usMap.getScale();
      previewGroup.selectAll('polyline.draw-points-line')
        .data(vertices.length ? [vertices] : [])
        .join('polyline')
        .attr('class', 'draw-points-line')
        .attr('points', (points) => points.map((p) => p.join(',')).join(' '));
      previewGroup.selectAll('circle')
        .data(vertices)
        .join('circle')
        .attr('class', (_, i) => (i === 0 ? 'draw-vertex is-first' : 'draw-vertex'))
        .attr('cx', (p) => p[0])
        .attr('cy', (p) => p[1])
        .attr('r', (_, i) => (i === 0 ? 7 : 4.5) / k);
    }

    function finishPoints() {
      const points = vertices;
      vertices = [];
      renderVertices();
      commit(points);
    }

    svgNode.addEventListener('click', (event) => {
      if (mode !== 'points') return;
      const point = usMap.localPoint(event);
      const first = vertices[0];
      if (first && vertices.length >= 3
        && Math.hypot(point[0] - first[0], point[1] - first[1]) * usMap.getScale() < 10) {
        finishPoints();
        return;
      }
      vertices.push(point);
      renderVertices();
    });

    svgNode.addEventListener('dblclick', (event) => {
      if (mode !== 'points') return;
      event.preventDefault();
      // The double-click already added the same vertex twice.
      vertices.pop();
      finishPoints();
    });

    usMap.onZoom(() => renderVertices());

    function setMode(nextMode) {
      if (mode === 'points' && nextMode !== 'points') {
        vertices = [];
        renderVertices();
      }
      mode = nextMode;
      usMap.svg
        .classed('is-pan', mode === 'pan')
        .classed('is-freehand', mode === 'freehand')
        .classed('is-points', mode === 'points');
      usMap.setZoomFilter((event) => {
        if (event.type === 'wheel') return true;
        if (event.type === 'dblclick') return mode === 'pan';
        return mode !== 'freehand' && !event.ctrlKey && !event.button;
      });
    }

    function undo() {
      if (vertices.length) {
        vertices.pop();
        renderVertices();
        return;
      }
      if (shapes.pop()) {
        renderShapes();
        emit();
      }
    }

    function clear() {
      vertices = [];
      renderVertices();
      shapes.length = 0;
      renderShapes();
      emit();
    }

    function load(geometry) {
      shapes.length = 0;
      polygonsOf(geometry).forEach((polygon) => shapes.push(polygon[0]));
      renderShapes();
    }

    return {
      setMode,
      undo,
      clear,
      load,
      finishPoints,
      getGeometry,
    };
  }

  window.RegionMap = {
    PATH_STYLES,
    loadTopology,
    loadStates,
    createUsMap,
    createDrawer,
    statesTouched,
    areaSqMi,
    centroidOf,
  };
})();
